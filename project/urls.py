from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('yourapp.urls')),  # Replace 'yourapp' with your actual app name
] 