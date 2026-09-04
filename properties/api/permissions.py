from rest_framework.permissions import BasePermission


class IsOwnerUser(BasePermission):
    """Allow only authenticated users whose Profile.user_type is owner."""

    message = "Owner access required."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        profile = getattr(user, "profile", None)
        return bool(profile and profile.user_type == "owner")


class IsCustomerUser(BasePermission):
    """Allow only authenticated users whose Profile.user_type is customer."""

    message = "Customer access required."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        profile = getattr(user, "profile", None)
        return bool(profile and profile.user_type == "customer")
