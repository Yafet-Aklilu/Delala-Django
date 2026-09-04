from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from properties.models import Property, PropertyImage

from .permissions import IsOwnerUser
from .serializers import PropertyCreateSerializer, PropertySerializer


class PropertyListAPIView(generics.ListAPIView):
    """Public marketplace listing — unchanged behavior."""

    permission_classes = [AllowAny]
    queryset = Property.objects.prefetch_related("images").all()
    serializer_class = PropertySerializer


class PropertyDetailAPIView(generics.RetrieveAPIView):
    """Public property detail — unchanged behavior."""

    permission_classes = [AllowAny]
    queryset = Property.objects.prefetch_related("images").all()
    serializer_class = PropertySerializer


class OwnerPropertyListCreateAPIView(generics.ListCreateAPIView):
    """
    GET  — authenticated owner's properties
    POST — create a property owned by the authenticated owner
    """

    permission_classes = [IsAuthenticated, IsOwnerUser]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return PropertyCreateSerializer
        return PropertySerializer

    def get_queryset(self):
        return (
            Property.objects.filter(owner=self.request.user)
            .prefetch_related("images")
            .order_by("-listed_at")
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        property_obj = serializer.save(owner=request.user)

        for image in request.FILES.getlist("images"):
            PropertyImage.objects.create(property=property_obj, image=image)

        output = PropertySerializer(
            property_obj,
            context={"request": request},
        )
        return Response(output.data, status=status.HTTP_201_CREATED)
