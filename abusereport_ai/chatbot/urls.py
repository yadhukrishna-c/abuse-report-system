from django.urls import path
from . import views

urlpatterns = [
    path('', views.chatbot, name="chatbot"),
    path('get/', views.get_response),
]