from django.urls import path
from .views import home, property_list, property_detail, login_view, signup_view, owner_home, customer_home, add_property

urlpatterns = [
    path('', home, name='home'),  # Home page at /
    path('properties/', property_list, name='property_list'),
    path('property/<int:pk>/', property_detail, name='property_detail'),
    path('signup/', signup_view, name='signup'),
    path('login/', login_view, name='login'),
    path('owner-home/', owner_home, name='owner_home'),path("owner-home/", owner_home, name="owner_home"),
    path("customer-home/", customer_home, name="customer_home"),
    path("add-property/", add_property, name="add_property"),
    path('upload/', add_property, name='upload_property'),
]
