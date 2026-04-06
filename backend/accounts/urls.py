from django.urls import path

from .views import (
    AdminUsersListAPIView,
    AuthUserByIdAPIView,
    LoginAPIView,
    LogoutAPIView,
    RegisterAPIView,
    TokenRefreshAPIView,
    UserAppUsageModeAPIView,
)

urlpatterns = [
    path("register/", RegisterAPIView.as_view(), name="register"),
    path("login/", LoginAPIView.as_view(), name="login"),
    path("logout/", LogoutAPIView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshAPIView.as_view(), name="token-refresh"),
    path("admin/users/", AdminUsersListAPIView.as_view(), name="admin-users-list"),
    path("<uuid:user_id>/", AuthUserByIdAPIView.as_view(), name="auth-user-by-id"),
    path(
        "<uuid:user_id>/app-usage-mode/",
        UserAppUsageModeAPIView.as_view(),
        name="auth-user-app-usage-mode"
    ),
]
