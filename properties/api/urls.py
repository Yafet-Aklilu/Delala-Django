from django.urls import path

from .auth_views import (
    CsrfAPIView,
    LoginAPIView,
    LogoutAPIView,
    MeAPIView,
    SignupAPIView,
)
from .message_views import (
    ConversationDetailAPIView,
    ConversationListCreateAPIView,
    ConversationMarkReadAPIView,
    ConversationMessageCreateAPIView,
)
from .notification_views import (
    NotificationListAPIView,
    NotificationMarkReadAPIView,
)
from .request_views import (
    CustomerPropertyRequestListAPIView,
    OwnerPropertyRequestListAPIView,
    PropertyRequestCreateAPIView,
    PropertyRequestStatusUpdateAPIView,
)
from .views import (
    OwnerPropertyListCreateAPIView,
    PropertyDetailAPIView,
    PropertyListAPIView,
)

urlpatterns = [
    path('properties/', PropertyListAPIView.as_view(), name='api_property_list'),
    path('properties/mine/', OwnerPropertyListCreateAPIView.as_view(), name='api_owner_property_list'),
    path('properties/<int:pk>/', PropertyDetailAPIView.as_view(), name='api_property_detail'),
    path('requests/', PropertyRequestCreateAPIView.as_view(), name='api_request_create'),
    path('requests/mine/', CustomerPropertyRequestListAPIView.as_view(), name='api_request_mine'),
    path('requests/received/', OwnerPropertyRequestListAPIView.as_view(), name='api_request_received'),
    path('requests/<int:pk>/', PropertyRequestStatusUpdateAPIView.as_view(), name='api_request_status'),
    path('messages/conversations/', ConversationListCreateAPIView.as_view(), name='api_message_conversations'),
    path('messages/conversations/<int:pk>/', ConversationDetailAPIView.as_view(), name='api_message_conversation_detail'),
    path('messages/conversations/<int:pk>/messages/', ConversationMessageCreateAPIView.as_view(), name='api_message_send'),
    path('messages/conversations/<int:pk>/read/', ConversationMarkReadAPIView.as_view(), name='api_message_mark_read'),
    path('notifications/', NotificationListAPIView.as_view(), name='api_notifications'),
    path('notifications/mark-read/', NotificationMarkReadAPIView.as_view(), name='api_notifications_mark_read'),
    path('auth/csrf/', CsrfAPIView.as_view(), name='api_auth_csrf'),
    path('auth/login/', LoginAPIView.as_view(), name='api_auth_login'),
    path('auth/signup/', SignupAPIView.as_view(), name='api_auth_signup'),
    path('auth/logout/', LogoutAPIView.as_view(), name='api_auth_logout'),
    path('auth/me/', MeAPIView.as_view(), name='api_auth_me'),
]
