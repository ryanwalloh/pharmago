from django.urls import path
from . import views

app_name = 'files'

urlpatterns = [
    path('document/<int:document_id>/', views.serve_document),
    path('pharmacy-storefront/<int:pharmacy_id>/', views.serve_pharmacy_storefront),
    path('document-presigned/<int:document_id>/', views.document_presigned_url),
    path('aws-diagnostics/', views.aws_diagnostics),
    path('prescription-image/<int:order_id>/', views.serve_prescription_image),
    path('upload-prescription-image/', views.upload_prescription_image),
    path('upload-driver-license/', views.upload_driver_license_image),
]


