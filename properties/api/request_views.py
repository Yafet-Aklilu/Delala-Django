from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from properties.models import Notification, Property, PropertyRequest

from .permissions import IsCustomerUser, IsOwnerUser
from .serializers import (
    CustomerPropertyRequestSerializer,
    OwnerPropertyRequestSerializer,
    PropertyRequestCreateSerializer,
    PropertyRequestStatusSerializer,
)


def _request_queryset():
    return PropertyRequest.objects.select_related(
        "property",
        "property__owner",
        "customer",
        "customer__profile",
    ).prefetch_related("property__images")


def _notify(*, recipient, title, message, link="", property_request=None, property_obj=None):
    return Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        link=link,
        property_request=property_request,
        property=property_obj,
    )


class PropertyRequestCreateAPIView(APIView):
    """POST /api/requests/ — authenticated customer creates a request."""

    permission_classes = [IsAuthenticated, IsCustomerUser]

    def post(self, request):
        serializer = PropertyRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        property_id = serializer.validated_data["property_id"]
        property_obj = Property.objects.select_related("owner").get(pk=property_id)

        existing = (
            _request_queryset()
            .filter(
                property=property_obj,
                customer=request.user,
                status=PropertyRequest.STATUS_PENDING,
            )
            .first()
        )
        if existing:
            payload = CustomerPropertyRequestSerializer(
                existing,
                context={"request": request},
            ).data
            payload["already_exists"] = True
            return Response(payload, status=status.HTTP_200_OK)

        try:
            with transaction.atomic():
                property_request = PropertyRequest.objects.create(
                    property=property_obj,
                    customer=request.user,
                    status=PropertyRequest.STATUS_PENDING,
                )
                _notify(
                    recipient=property_obj.owner,
                    title="New property request",
                    message="Someone has requested your property.",
                    link="/owner/requests",
                    property_request=property_request,
                    property_obj=property_obj,
                )
                _notify(
                    recipient=request.user,
                    title="Request sent",
                    message=(
                        f"Your request for {property_obj.title} has been sent to the owner."
                    ),
                    link="/customer/requests",
                    property_request=property_request,
                    property_obj=property_obj,
                )
        except IntegrityError:
            # Race: another pending request landed between check and create.
            existing = (
                _request_queryset()
                .filter(
                    property=property_obj,
                    customer=request.user,
                    status=PropertyRequest.STATUS_PENDING,
                )
                .first()
            )
            if existing:
                payload = CustomerPropertyRequestSerializer(
                    existing,
                    context={"request": request},
                ).data
                payload["already_exists"] = True
                return Response(payload, status=status.HTTP_200_OK)
            raise

        property_request = _request_queryset().get(pk=property_request.pk)
        payload = CustomerPropertyRequestSerializer(
            property_request,
            context={"request": request},
        ).data
        payload["already_exists"] = False
        return Response(payload, status=status.HTTP_201_CREATED)


class CustomerPropertyRequestListAPIView(APIView):
    """GET /api/requests/mine/"""

    permission_classes = [IsAuthenticated, IsCustomerUser]

    def get(self, request):
        qs = _request_queryset().filter(customer=request.user)
        data = CustomerPropertyRequestSerializer(
            qs,
            many=True,
            context={"request": request},
        ).data
        return Response(data)


class OwnerPropertyRequestListAPIView(APIView):
    """GET /api/requests/received/"""

    permission_classes = [IsAuthenticated, IsOwnerUser]

    def get(self, request):
        qs = _request_queryset().filter(property__owner=request.user)
        data = OwnerPropertyRequestSerializer(
            qs,
            many=True,
            context={"request": request},
        ).data
        return Response(data)


class PropertyRequestStatusUpdateAPIView(APIView):
    """PATCH /api/requests/<id>/ — owner accepts or declines."""

    permission_classes = [IsAuthenticated, IsOwnerUser]

    def patch(self, request, pk):
        try:
            property_request = _request_queryset().get(
                pk=pk,
                property__owner=request.user,
            )
        except PropertyRequest.DoesNotExist:
            return Response(
                {"detail": "Request not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PropertyRequestStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]

        if property_request.status == new_status:
            data = OwnerPropertyRequestSerializer(
                property_request,
                context={"request": request},
            ).data
            return Response(data)

        with transaction.atomic():
            property_request.status = new_status
            property_request.save(update_fields=["status", "updated_at"])

            if new_status == PropertyRequest.STATUS_ACCEPTED:
                title = "Request accepted"
                message = (
                    f"Your request for {property_request.property.title} "
                    "was accepted by the owner."
                )
            else:
                title = "Request declined"
                message = (
                    f"Your request for {property_request.property.title} "
                    "was declined by the owner."
                )

            _notify(
                recipient=property_request.customer,
                title=title,
                message=message,
                link="/customer/requests",
                property_request=property_request,
                property_obj=property_request.property,
            )

        property_request = _request_queryset().get(pk=property_request.pk)
        data = OwnerPropertyRequestSerializer(
            property_request,
            context={"request": request},
        ).data
        return Response(data)
