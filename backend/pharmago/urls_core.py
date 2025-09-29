"""
Lean URL configuration for pharmago project (post-refactor).
"""
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponseRedirect
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from api import views


def redirect_magic_link(request, token):
    return HttpResponseRedirect(f"{settings.FRONTEND_URL}/initial-login?token={token}")


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/ping/', views.ping),
    path('api/', include(('api.direct.urls', 'direct'), namespace='direct')),
    path('api/', include(('api.files.urls', 'files'), namespace='files')),
    path('api/', include(('api.users.urls_direct', 'users_direct'), namespace='users_direct')),
    path('api/', include('api.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    # Legacy magic link path support -> redirect to web frontend route
    path('magic-link-login/<str:token>/', redirect_magic_link),
]

if settings.DEBUG:
    urlpatterns += [
        path('api/', include(('api.chat.urls_dev', 'chat_dev'), namespace='chat_dev')),
    ]
    urlpatterns += staticfiles_urlpatterns()
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


