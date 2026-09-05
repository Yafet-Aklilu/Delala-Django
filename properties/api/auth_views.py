import re

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from delala.firebase import FirebaseAuthError, verify_firebase_id_token
from properties.models import Profile


VALID_USER_TYPES = {"owner", "customer"}


def serialize_user(user: User) -> dict:
    profile = getattr(user, "profile", None)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "user_type": profile.user_type if profile else None,
        "phone_no": profile.phone_no if profile else None,
    }


def _auth_success_payload(user: User) -> dict:
    profile = getattr(user, "profile", None)
    user_type = profile.user_type if profile else None
    return {
        "user": serialize_user(user),
        "redirect": (
            "/owner"
            if user_type == "owner"
            else "/customer"
            if user_type == "customer"
            else "/"
        ),
    }


def _attach_firebase_uid(profile: Profile, firebase_uid: str) -> Profile:
    """Attach firebase_uid if missing; fail safely on conflicts."""
    existing = (profile.firebase_uid or "").strip()
    if existing and existing != firebase_uid:
        raise FirebaseAuthError(
            "firebase_uid_conflict",
            "This Delala account is already linked to a different Firebase user.",
            status=409,
        )
    if existing == firebase_uid:
        return profile

    clash = (
        Profile.objects.filter(firebase_uid=firebase_uid)
        .exclude(pk=profile.pk)
        .exists()
    )
    if clash:
        raise FirebaseAuthError(
            "firebase_uid_conflict",
            "This Firebase account is already linked to another Delala user.",
            status=409,
        )

    profile.firebase_uid = firebase_uid
    try:
        profile.save(update_fields=["firebase_uid"])
    except IntegrityError as exc:
        raise FirebaseAuthError(
            "firebase_uid_conflict",
            "This Firebase account is already linked to another Delala user.",
            status=409,
        ) from exc
    return profile


def _profile_completion_required_error(
    *,
    email: str,
    firebase_uid: str,
    field_errors: dict | None = None,
) -> FirebaseAuthError:
    err = FirebaseAuthError(
        "profile_completion_required",
        (
            "No Delala profile exists for this Firebase account yet. "
            "Provide user_type, phone_no, username, first_name, and last_name "
            "to create one."
        ),
        status=409,
    )
    err.email = email
    err.firebase_uid = firebase_uid
    if field_errors:
        err.field_errors = field_errors
    return err


def _get_user_profile(user: User) -> Profile | None:
    """Return Profile if present without raising on missing OneToOne."""
    return Profile.objects.filter(user=user).select_related("user").first()


def _validate_completion_fields_for_existing_user(user: User, data) -> dict:
    """
    Validate Delala fields needed to finish a Profile on an existing User.
    Names fall back to the User record when omitted (Google may already set them).
    """
    user_type = (data.get("user_type") or "").strip()
    username = (data.get("username") or "").strip() or user.username
    phone_no = (data.get("phone_no") or "").strip()
    first_name = (data.get("first_name") or "").strip() or (user.first_name or "")
    last_name = (data.get("last_name") or "").strip() or (user.last_name or "")

    errors = {}
    if user_type not in VALID_USER_TYPES:
        errors["user_type"] = "Select customer or property owner."
    if not username:
        errors["username"] = "Username is required."
    if not phone_no:
        errors["phone_no"] = "Phone number is required."
    if phone_no and not re.match(r"^(09|07)\d{8}$", phone_no):
        errors["phone_no"] = "Phone must be 10 digits and start with 09 or 07."
    if (
        username
        and User.objects.filter(username=username).exclude(pk=user.pk).exists()
    ):
        errors["username"] = "Username already taken."
    if phone_no and Profile.objects.filter(phone_no=phone_no).exists():
        errors["phone_no"] = "Phone number already in use."

    if errors:
        return {"errors": errors}

    return {
        "user_type": user_type,
        "username": username,
        "phone_no": phone_no,
        "first_name": first_name or "User",
        "last_name": last_name,
    }


def _attach_profile_to_existing_user(
    user: User,
    *,
    firebase_uid: str,
    fields: dict,
) -> User:
    """Create Profile for an existing User and link the Firebase UID."""
    with transaction.atomic():
        if Profile.objects.filter(firebase_uid=firebase_uid).exclude(
            user=user
        ).exists():
            raise FirebaseAuthError(
                "firebase_uid_conflict",
                "This Firebase account is already linked to another Delala user.",
                status=409,
            )
        if Profile.objects.filter(user=user).exists():
            raise FirebaseAuthError(
                "account_conflict",
                "This Delala account already has a profile.",
                status=409,
            )

        user.username = fields["username"]
        user.first_name = fields["first_name"]
        user.last_name = fields["last_name"]
        try:
            user.save()
            Profile.objects.create(
                user=user,
                user_type=fields["user_type"],
                phone_no=fields["phone_no"],
                firebase_uid=firebase_uid,
            )
        except IntegrityError as exc:
            raise FirebaseAuthError(
                "account_conflict",
                "Could not complete Delala profile due to a uniqueness conflict.",
                status=409,
            ) from exc
        return user


def _validate_new_profile_fields(data) -> dict:
    """Validate Delala profile fields for first-time Firebase account creation."""
    user_type = (data.get("user_type") or "").strip()
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    username = (data.get("username") or "").strip()
    phone_no = (data.get("phone_no") or "").strip()

    errors = {}
    if user_type not in VALID_USER_TYPES:
        errors["user_type"] = "Select customer or property owner."
    if not first_name:
        errors["first_name"] = "First name is required."
    if not last_name:
        errors["last_name"] = "Last name is required."
    if not username:
        errors["username"] = "Username is required."
    if not phone_no:
        errors["phone_no"] = "Phone number is required."
    if phone_no and not re.match(r"^(09|07)\d{8}$", phone_no):
        errors["phone_no"] = "Phone must be 10 digits and start with 09 or 07."
    if username and User.objects.filter(username=username).exists():
        errors["username"] = "Username already taken."
    if phone_no and Profile.objects.filter(phone_no=phone_no).exists():
        errors["phone_no"] = "Phone number already in use."

    if errors:
        return {"errors": errors}

    return {
        "user_type": user_type,
        "first_name": first_name,
        "last_name": last_name,
        "username": username,
        "phone_no": phone_no,
    }


def _create_firebase_user(
    *,
    firebase_uid: str,
    email: str,
    fields: dict,
) -> User:
    with transaction.atomic():
        if Profile.objects.filter(firebase_uid=firebase_uid).exists():
            raise FirebaseAuthError(
                "firebase_uid_conflict",
                "This Firebase account is already linked to another Delala user.",
                status=409,
            )
        if User.objects.filter(email__iexact=email).exists():
            raise FirebaseAuthError(
                "email_conflict",
                "A Delala account with this email already exists.",
                status=409,
            )

        user = User(username=fields["username"], email=email)
        user.set_unusable_password()
        user.first_name = fields["first_name"]
        user.last_name = fields["last_name"]
        try:
            user.save()
            Profile.objects.create(
                user=user,
                user_type=fields["user_type"],
                phone_no=fields["phone_no"],
                firebase_uid=firebase_uid,
            )
        except IntegrityError as exc:
            raise FirebaseAuthError(
                "account_conflict",
                "Could not create Delala account due to a uniqueness conflict.",
                status=409,
            ) from exc
        return user


class CsrfAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        return Response({"csrfToken": get_token(request)})


class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"user": serialize_user(request.user)})


class LogoutAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        logout(request)
        return Response({"detail": "Logged out."})


class LoginAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = (request.data.get("email") or "").strip()
        password = request.data.get("password") or ""
        user_type = (request.data.get("user_type") or "").strip()

        errors = {}
        if not email:
            errors["email"] = "Email is required."
        if not password:
            errors["password"] = "Password is required."
        if user_type not in VALID_USER_TYPES:
            errors["user_type"] = "Select customer or property owner."

        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            profile = Profile.objects.select_related("user").get(user__email=email)
        except Profile.DoesNotExist:
            return Response(
                {"errors": {"form": "Invalid email or password."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(
            request,
            username=profile.user.username,
            password=password,
        )
        if user is None:
            return Response(
                {"errors": {"form": "Invalid email or password."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify selected role against the stored Profile.user_type
        if profile.user_type != user_type:
            return Response(
                {
                    "errors": {
                        "user_type": (
                            "This account is registered as a "
                            f"{'property owner' if profile.user_type == 'owner' else 'customer'}. "
                            "Select the correct role to continue."
                        )
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        login(request, user)
        return Response(
            {
                "user": serialize_user(user),
                "redirect": (
                    "/owner" if profile.user_type == "owner" else "/customer"
                ),
            }
        )


class SignupAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        user_type = (request.data.get("user_type") or "").strip()
        first_name = (request.data.get("first_name") or "").strip()
        last_name = (request.data.get("last_name") or "").strip()
        username = (request.data.get("username") or "").strip()
        email = (request.data.get("email") or "").strip()
        phone_no = (request.data.get("phone_no") or "").strip()
        password = request.data.get("password") or ""
        confirm_password = request.data.get("confirm_password") or ""

        errors = {}

        if user_type not in VALID_USER_TYPES:
            errors["user_type"] = "Select customer or property owner."
        if not first_name:
            errors["first_name"] = "First name is required."
        if not last_name:
            errors["last_name"] = "Last name is required."
        if not username:
            errors["username"] = "Username is required."
        if not email:
            errors["email"] = "Email is required."
        if not phone_no:
            errors["phone_no"] = "Phone number is required."
        if not password:
            errors["password"] = "Password is required."
        if not confirm_password:
            errors["confirm_password"] = "Confirm your password."

        if password and confirm_password and password != confirm_password:
            errors["confirm_password"] = "Passwords do not match."

        if phone_no and not re.match(r"^(09|07)\d{8}$", phone_no):
            errors["phone_no"] = "Phone must be 10 digits and start with 09 or 07."

        if email and not email.endswith("@gmail.com"):
            errors["email"] = "Email must end with @gmail.com."

        if username and User.objects.filter(username=username).exists():
            errors["username"] = "Username already taken."

        if email and User.objects.filter(email=email).exists():
            errors["email"] = "Email already in use."

        if phone_no and Profile.objects.filter(phone_no=phone_no).exists():
            errors["phone_no"] = "Phone number already in use."

        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
        )
        user.first_name = first_name
        user.last_name = last_name
        user.save()

        Profile.objects.create(user=user, user_type=user_type, phone_no=phone_no)
        login(request, user)

        return Response(
            {
                "user": serialize_user(user),
                "redirect": "/owner" if user_type == "owner" else "/customer",
            },
            status=status.HTTP_201_CREATED,
        )


class FirebaseSessionExchangeAPIView(APIView):
    """
    POST /api/auth/firebase/

    Verify a Firebase ID token, link or create a Delala User/Profile, then
    establish a normal Django session. CSRF remains enabled.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        id_token = request.data.get("id_token") or request.data.get("token") or ""

        try:
            claims = verify_firebase_id_token(id_token)
            user, created = self._resolve_user(request, claims)
        except FirebaseAuthError as exc:
            payload = {"code": exc.code, "detail": exc.message}
            if getattr(exc, "email", None) is not None:
                payload["email"] = exc.email
            if getattr(exc, "firebase_uid", None) is not None:
                payload["firebase_uid"] = exc.firebase_uid
            if getattr(exc, "field_errors", None):
                payload["errors"] = exc.field_errors
            return Response(payload, status=exc.status)

        login(request, user)
        payload = _auth_success_payload(user)
        return Response(
            payload,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def _resolve_user(self, request, claims: dict) -> tuple[User, bool]:
        firebase_uid = str(claims.get("uid") or claims.get("sub") or "").strip()
        email = (claims.get("email") or "").strip()
        email_verified = bool(claims.get("email_verified"))

        if not firebase_uid:
            raise FirebaseAuthError(
                "invalid_token",
                "Firebase ID token is missing a user id.",
                status=401,
            )

        # 1) Prefer existing link by Firebase UID.
        profile = (
            Profile.objects.select_related("user")
            .filter(firebase_uid=firebase_uid)
            .first()
        )
        if profile:
            return profile.user, False

        # 2) Link existing Django user by verified email only.
        if email and email_verified:
            matches = list(
                User.objects.select_related("profile").filter(email__iexact=email)
            )
            if len(matches) > 1:
                raise FirebaseAuthError(
                    "email_conflict",
                    "Multiple Delala accounts share this email; cannot link safely.",
                    status=409,
                )
            if len(matches) == 1:
                user = matches[0]
                profile = _get_user_profile(user)
                if profile is None:
                    # Existing User without Profile — complete when fields provided;
                    # otherwise ask the frontend to collect them.
                    validated = _validate_completion_fields_for_existing_user(
                        user, request.data
                    )
                    if "errors" in validated:
                        raise _profile_completion_required_error(
                            email=email,
                            firebase_uid=firebase_uid,
                            field_errors=validated["errors"],
                        )
                    user = _attach_profile_to_existing_user(
                        user,
                        firebase_uid=firebase_uid,
                        fields=validated,
                    )
                    return user, False
                _attach_firebase_uid(profile, firebase_uid)
                return user, False
        elif email and not email_verified:
            # Never auto-link or create using an unverified email.
            raise FirebaseAuthError(
                "email_unverified",
                "Verify your email with Firebase before linking to a Delala account.",
                status=403,
            )

        # 3) No existing account — create only with complete Delala profile fields.
        if not email or not email_verified:
            raise FirebaseAuthError(
                "email_required",
                "A verified email is required to create a Delala account.",
                status=403,
            )

        validated = _validate_new_profile_fields(request.data)
        if "errors" in validated:
            raise _profile_completion_required_error(
                email=email,
                firebase_uid=firebase_uid,
                field_errors=validated["errors"],
            )

        user = _create_firebase_user(
            firebase_uid=firebase_uid,
            email=email,
            fields=validated,
        )
        return user, True
