from django.shortcuts import render, redirect, get_object_or_404
from django.core.exceptions import ValidationError
from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from .models import Property, PropertyImage, Profile  # Use Profile instead of User
from .forms import PropertyForm, PropertyImageForm
from .forms import SignupForm
import re


def property_list(request):
    properties = Property.objects.all()
    return render(request, 'properties/property_list.html', {'properties': properties})


def property_detail(request, pk):
    property_obj = get_object_or_404(Property, pk=pk)
    return render(request, 'properties/property_detail.html', {'property': property_obj})


def validate_image_count(property_instance):
    image_count = PropertyImage.objects.filter(property=property_instance).count()
    if image_count != 5:
        raise ValidationError("Each property must have exactly 5 images.")


def home(request):
    return render(request, 'properties/home.html')


def signup_view(request):
    errors = {}

    if request.method == "POST":
        user_type = request.POST.get("user_type")
        first_name = request.POST.get("first_name", "").strip()
        last_name = request.POST.get("last_name", "").strip()
        username = request.POST.get("username", "").strip()
        email = request.POST.get("email", "").strip()
        phone_no = request.POST.get("phone_no", "").strip()
        password = request.POST.get("password")
        confirm_password = request.POST.get("confirm_password")

        # ✅ Check if passwords match
        if password != confirm_password:
            errors["confirm_password"] = "Passwords do not match."

        # ✅ Validate phone number format (must be 10 digits, start with 09 or 07)
        if not re.match(r"^(09|07)\d{8}$", phone_no):
            errors["phone_no"] = "Phone must be 10 digits and start with 09 or 07."

        # ✅ Validate email format (must be @gmail.com)
        if not email.endswith("@gmail.com"):
            errors["email"] = "Email must end with @gmail.com."

        # ✅ Check if username is taken
        if User.objects.filter(username=username).exists():
            errors["username"] = "Username already taken."

        # ✅ Check if email is already in use
        if User.objects.filter(email=email).exists():
            errors["email"] = "Email already in use."

        # ✅ Check if phone number is already in use
        if Profile.objects.filter(phone_no=phone_no).exists():
            errors["phone_no"] = "Phone number already in use."

        if not errors:
            # ✅ Create User first
            user = User.objects.create_user(username=username, email=email, password=password)
            user.first_name = first_name
            user.last_name = last_name
            user.save()

            # ✅ Create Profile and associate it with the User
            Profile.objects.create(user=user, user_type=user_type, phone_no=phone_no)

            # ✅ Log the user in
            login(request, user)

            # ✅ Redirect based on user type
            if user_type == "customer":
                return redirect("customer_home")
            elif user_type == "owner":
                return redirect("owner_home")

    # Pass errors and form data back to template if form submission fails
    return render(request, "properties/signup.html", {
        "errors": errors,
        "user_type": request.POST.get("user_type", ""),
        "first_name": request.POST.get("first_name", ""),
        "last_name": request.POST.get("last_name", ""),
        "username": request.POST.get("username", ""),
        "email": request.POST.get("email", ""),
        "phone_no": request.POST.get("phone_no", ""),
    })

def login_view(request):
    error_message = None

    if request.method == "POST":
        user_type = request.POST.get("user_type")
        email = request.POST.get("email")
        password = request.POST.get("password")

        try:
            profile = Profile.objects.get(user__email=email)
            user = authenticate(request, username=profile.user.username, password=password)
        except Profile.DoesNotExist:
            user = None

        if user is not None:
            login(request, user)
            if user_type == "customer":
                return redirect("customer_home")
            elif user_type == "owner":
                return redirect("owner_home")
        else:
            error_message = "Invalid email or password. Please try again."

    return render(request, "properties/login.html", {"error_message": error_message})

def add_property(request):
    if request.method == 'POST':
        property_form = PropertyForm(request.POST)
        if property_form.is_valid():
            property_instance = property_form.save()

            # Handle multiple image uploads manually
            images = request.FILES.getlist('images')  # Get multiple uploaded images
            for image in images:
                PropertyImage.objects.create(property=property_instance, image=image)

            return redirect('property_list')

    else:
        property_form = PropertyForm()

    return render(request, 'properties/add_property.html', {'property_form': property_form})

@login_required
def owner_home(request):
    return render(request, "properties/owner_home.html")


@login_required
def customer_home(request):
    return render(request, "properties/customer_home.html")
