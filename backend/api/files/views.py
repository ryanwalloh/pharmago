from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt


def serve_document(request, document_id):
    from api.users.models import UserDocument
    from django.http import HttpResponse, Http404
    import boto3
    from botocore.exceptions import ClientError
    from urllib.parse import urlparse
    import mimetypes
    import os

    try:
        document = UserDocument.objects.get(id=document_id)
        if not document.file_url:
            raise Http404("Document file not found")

        s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_S3_REGION_NAME', 'ap-southeast-2'),
        )
        bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME', 'pharmago-user-uploads')
        parsed = urlparse(document.file_url)
        path = parsed.path.lstrip('/')
        if path.startswith(f"{bucket_name}/"):
            key = path[len(bucket_name) + 1:]
        else:
            key = path

        response = s3_client.get_object(Bucket=bucket_name, Key=key)
        file_content = response['Body'].read()
        guessed, _ = mimetypes.guess_type(parsed.path)
        content_type = response.get('ContentType') or guessed or 'application/octet-stream'

        http_response = HttpResponse(file_content, content_type=content_type)
        content_length = response.get('ContentLength')
        if content_length is not None:
            http_response['Content-Length'] = str(content_length)
        http_response['Accept-Ranges'] = 'bytes'
        http_response['Cache-Control'] = 'public, max-age=86400'
        filename_ext = os.path.splitext(parsed.path)[1] or ''
        http_response['Content-Disposition'] = f'inline; filename="document_{document.id}{filename_ext}"'
        return http_response
    except ClientError as e:
        print(f"ERROR fetching document from S3: {e}")
        try:
            from django.shortcuts import redirect
            return redirect(document.file_url)
        except Exception:
            raise Http404("Unable to fetch document")
    except UserDocument.DoesNotExist:
        print(f"ERROR: Document with ID {document_id} not found")
        raise Http404("Document not found")
    except Exception as e:
        print(f"ERROR in serve_document: {e}")
        raise Http404("Error serving document")


def serve_pharmacy_storefront(request, pharmacy_id):
    from django.http import HttpResponse, Http404
    import boto3
    from botocore.exceptions import ClientError
    from urllib.parse import urlparse
    from api.users.models import Pharmacy, UserDocument
    import os

    try:
        pharmacy = Pharmacy.objects.get(id=pharmacy_id)

        storefront_doc = UserDocument.objects.filter(
            user=pharmacy.user,
            id_type__name__icontains='storefront'
        ).first()
        if not storefront_doc:
            storefront_doc = UserDocument.objects.filter(
                user=pharmacy.user,
                document_file__icontains='storefront'
            ).first()

        if not storefront_doc or not storefront_doc.file_url:
            raise Http404("Storefront image not found")

        s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_S3_REGION_NAME', 'ap-southeast-2'),
        )

        bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME', 'pharmago-user-uploads')
        parsed = urlparse(storefront_doc.file_url)
        path = parsed.path.lstrip('/')
        if path.startswith(f"{bucket_name}/"):
            key = path[len(bucket_name) + 1:]
        else:
            key = path

        response = s3_client.get_object(Bucket=bucket_name, Key=key)
        file_content = response['Body'].read()
        content_type = response.get('ContentType') or 'image/jpeg'

        http_response = HttpResponse(file_content, content_type=content_type)
        content_length = response.get('ContentLength')
        if content_length is not None:
            http_response['Content-Length'] = str(content_length)
        http_response['Cache-Control'] = 'public, max-age=86400'
        http_response['Accept-Ranges'] = 'bytes'
        return http_response
    except Pharmacy.DoesNotExist:
        raise Http404("Pharmacy not found")
    except ClientError as e:
        print(f"ERROR fetching storefront from S3: {e}")
        try:
            from django.shortcuts import redirect
            return redirect(storefront_doc.file_url)
        except Exception:
            raise Http404("Unable to fetch storefront image")
    except Exception as e:
        print(f"ERROR in serve_pharmacy_storefront: {e}")
        raise Http404("Error serving storefront image")


def document_presigned_url(request, document_id):
    try:
        from api.users.models import UserDocument
        import boto3
        from urllib.parse import urlparse
        import os

        doc = UserDocument.objects.get(id=document_id)
        if not doc.file_url:
            return JsonResponse({'success': False, 'error': 'Document has no file_url'}, status=404)

        bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME', 'pharmago-user-uploads')
        parsed = urlparse(doc.file_url)
        key = parsed.path.lstrip('/')
        if key.startswith(f"{bucket_name}/"):
            key = key[len(bucket_name) + 1:]

        s3 = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_S3_REGION_NAME', 'ap-southeast-2'),
        )

        url = s3.generate_presigned_url(
            'get_object', Params={'Bucket': bucket_name, 'Key': key}, ExpiresIn=3600
        )
        return JsonResponse({'success': True, 'url': url})
    except UserDocument.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Document not found'}, status=404)
    except Exception as e:
        print(f"ERROR in document_presigned_url: {e}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


def aws_diagnostics(request):
    try:
        import boto3
        import os
        sts = boto3.client(
            'sts',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_S3_REGION_NAME', 'ap-southeast-2'),
        )
        ident = sts.get_caller_identity()
        return JsonResponse({
            'success': True,
            'account': ident.get('Account'),
            'arn': ident.get('Arn'),
            'user_id': ident.get('UserId'),
            'region': os.getenv('AWS_S3_REGION_NAME'),
            'bucket': os.getenv('AWS_STORAGE_BUCKET_NAME'),
        })
    except Exception as e:
        print(f"ERROR in aws_diagnostics: {e}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


def serve_prescription_image(request, order_id):
    from api.orders.models import Order
    from django.http import HttpResponse, Http404
    import boto3
    from botocore.exceptions import ClientError
    import os

    try:
        order = Order.objects.get(id=order_id)
        if not order.prescription_image_url:
            raise Http404("Prescription image not found")

        s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_S3_REGION_NAME', 'ap-southeast-2'),
        )

        bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME', 'pharmago-user-uploads')
        url_parts = order.prescription_image_url.split('/')
        key = '/'.join(url_parts[3:])

        response = s3_client.get_object(Bucket=bucket_name, Key=key)
        file_content = response['Body'].read()

        content_type = 'application/octet-stream'
        url_lower = order.prescription_image_url.lower()
        if url_lower.endswith(('.jpg', '.jpeg')):
            content_type = 'image/jpeg'
        elif url_lower.endswith('.png'):
            content_type = 'image/png'
        elif url_lower.endswith('.pdf'):
            content_type = 'application/pdf'
        elif url_lower.endswith('.gif'):
            content_type = 'image/gif'

        http_response = HttpResponse(file_content, content_type=content_type)
        http_response['Content-Disposition'] = f'inline; filename="prescription_{order_id}.{order.prescription_image_url.split(".")[-1]}"'
        return http_response
    except ClientError as e:
        print(f"ERROR fetching prescription image from S3: {e}")
        raise Http404("Unable to fetch prescription image")
    except Order.DoesNotExist:
        print(f"ERROR: Order with ID {order_id} not found")
        raise Http404("Order not found")
    except Exception as e:
        print(f"ERROR in serve_prescription_image: {e}")
        raise Http404("Error serving prescription image")


@csrf_exempt
async def upload_prescription_image(request):
    """
    Async upload prescription image endpoint that supports both:
    1. JSON payload with Cloudinary URL (prescription_url) - Recommended for new implementations
    2. multipart/form-data with file upload (file/image) - Legacy support
    All DB operations wrapped with sync_to_async to prevent ASGI blocking.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    try:
        from django.core.files.storage import default_storage
        from django.utils import timezone
        from api.orders.models import Order
        from asgiref.sync import sync_to_async
        import uuid
        import os
        import json

        file_url = None
        order_id = None
        content_type = request.content_type or ''

        # Check if this is a JSON payload with Cloudinary URL
        if 'application/json' in content_type:
            try:
                data = json.loads(request.body)
                file_url = data.get('prescription_url')
                order_id = data.get('order_id')
                
                if not file_url:
                    return JsonResponse({'success': False, 'error': 'No prescription_url provided in JSON payload'}, status=400)
                
                print(f"📥 Received Cloudinary prescription URL: {file_url}")
                
            except json.JSONDecodeError as e:
                return JsonResponse({'success': False, 'error': 'Invalid JSON', 'message': str(e)}, status=400)
        
        # Handle multipart/form-data (legacy file upload) - wrapped in sync_to_async
        else:
            @sync_to_async
            def handle_file_upload():
                """Handle file upload to storage (blocking I/O)"""
                file_obj = request.FILES.get('file') or request.FILES.get('image')
                if not file_obj:
                    return None, None, 'No file uploaded. Use form-data key "file" or "image", or send JSON with "prescription_url".'

                today_path = timezone.now().strftime('%Y/%m/%d')
                _, ext = os.path.splitext(file_obj.name or '')
                if not ext:
                    ext = '.jpg'
                filename = f"prescriptions/{today_path}/{uuid.uuid4().hex}{ext}"

                saved_path = default_storage.save(filename, file_obj)
                url = default_storage.url(saved_path)
                oid = request.POST.get('order_id') or request.GET.get('order_id')
                
                print(f"📥 Uploaded prescription to storage: {url}")
                return url, oid, None
            
            file_url, order_id, error = await handle_file_upload()
            if error:
                return JsonResponse({'success': False, 'error': error}, status=400)

        # Update order if order_id is provided - wrapped in sync_to_async
        @sync_to_async
        def update_order_prescription():
            """Update order with prescription URL (DB operation)"""
            if not order_id:
                return False, None
            
            try:
                order = Order.objects.get(id=int(order_id))
                order.prescription_image_url = file_url
                order.save(update_fields=['prescription_image_url'])
                print(f"✅ Updated order {order_id} with prescription URL")
                return True, order_id
            except (Order.DoesNotExist, ValueError):
                print(f"⚠️ Order {order_id} not found")
                return False, order_id
        
        updated, final_order_id = await update_order_prescription()

        return JsonResponse({'success': True, 'url': file_url, 'order_id': final_order_id, 'order_updated': updated})
    except Exception as e:
        print(f"❌ Prescription upload error: {e}")
        return JsonResponse({'success': False, 'error': 'Upload failed', 'message': str(e)}, status=500)


@csrf_exempt
async def upload_driver_license_image(request):
    """
    Async upload driver's license image endpoint that supports both:
    1. JSON payload with Cloudinary URL (license_url) - Recommended for new implementations
    2. multipart/form-data with file upload (file/image) - Legacy support
    All DB operations wrapped with sync_to_async to prevent ASGI blocking.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    try:
        from django.core.files.storage import default_storage
        from django.utils import timezone
        from api.users.models import User, UserDocument
        from asgiref.sync import sync_to_async
        import uuid, os, json

        file_url = None
        user_id = None
        content_type = request.content_type or ''

        # Check if this is a JSON payload with Cloudinary URL
        if 'application/json' in content_type:
            try:
                data = json.loads(request.body)
                file_url = data.get('license_url')
                user_id = data.get('user_id')
                
                if not file_url:
                    return JsonResponse({'success': False, 'error': 'No license_url provided in JSON payload'}, status=400)
                
                print(f"📥 Received Cloudinary driver license URL: {file_url}")
                
            except json.JSONDecodeError as e:
                return JsonResponse({'success': False, 'error': 'Invalid JSON', 'message': str(e)}, status=400)
        
        # Handle multipart/form-data (legacy file upload) - wrapped in sync_to_async
        else:
            @sync_to_async
            def handle_file_upload():
                """Handle file upload to storage (blocking I/O)"""
                file_obj = request.FILES.get('file') or request.FILES.get('image')
                if not file_obj:
                    return None, None, 'No file uploaded. Use form-data key "file" or "image", or send JSON with "license_url".'

                today_path = timezone.now().strftime('%Y/%m/%d')
                _, ext = os.path.splitext(file_obj.name or '')
                if not ext:
                    ext = '.jpg'
                filename = f"drivers_licenses/{today_path}/{uuid.uuid4().hex}{ext}"

                saved_path = default_storage.save(filename, file_obj)
                url = default_storage.url(saved_path)
                uid = request.POST.get('user_id') or request.GET.get('user_id')
                
                print(f"📥 Uploaded driver license to storage: {url}")
                return url, uid, None
            
            file_url, user_id, error = await handle_file_upload()
            if error:
                return JsonResponse({'success': False, 'error': error}, status=400)

        # Create UserDocument if user_id is provided - wrapped in sync_to_async
        @sync_to_async
        def create_user_document():
            """Create UserDocument (DB operations)"""
            if not user_id:
                return None
            
            try:
                user = User.objects.get(id=int(user_id))
            except (User.DoesNotExist, ValueError):
                return None

            try:
                document = UserDocument.objects.create(
                    user=user,
                    id_type=None,
                    file_url=file_url,
                    document_file=file_url,
                    status='uploaded',
                )
                print(f"✅ Created UserDocument {document.id} for user {user.id}")
                return document.id
            except Exception as e:
                print(f"⚠️ Failed to create UserDocument: {e}")
                return None
        
        document_id = await create_user_document()

        return JsonResponse({'success': True, 'url': file_url, 'document_id': document_id})
    except Exception as e:
        print(f"❌ Driver license upload error: {e}")
        return JsonResponse({'success': False, 'error': 'Upload failed', 'message': str(e)}, status=500)


