import re

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

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
