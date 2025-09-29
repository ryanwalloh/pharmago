from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.http import JsonResponse


@csrf_exempt
def approve_rider_direct(request, rider_id):
    """Direct endpoint to approve a rider application."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    try:
        from api.users.models import Rider, User
        from django.utils import timezone

        rider = Rider.objects.select_related('user').get(id=rider_id)
        rider.status = 'approved'
        rider.is_fully_verified = True
        rider.verified_at = timezone.now()
        try:
            admin_user = User.objects.filter(role='admin', is_superuser=True).first()
            rider.verified_by = admin_user
        except Exception:
            pass
        rider.save()

        rider.user.status = 'active'
        rider.user.save(update_fields=['status'])

        return JsonResponse({
            'success': True,
            'email': rider.user.email,
            'phone_number': rider.user.phone_number,
        })
    except Rider.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Rider not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': 'Failed to approve rider', 'message': str(e)}, status=500)


@csrf_exempt
def complete_rider_registration(request):
    """Direct endpoint to create User, Rider, and UserDocument entries for a rider registration.

    Expected JSON body:
      {
        user: { username, email, phone_number, password, role='rider', first_name, last_name },
        rider: { first_name, last_name, middle_name, date_of_birth, gender, vehicle_*..., drivers_license_uploaded },
        documents: [{ id_type: 'drivers_license', file_url }]
      }
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

    import json
    try:
        payload = json.loads(request.body or '{}')

        from api.users.models import User, Rider, UserDocument, ValidID
        from django.db import transaction

        user_data = payload.get('user') or {}
        rider_data = payload.get('rider') or {}
        documents = payload.get('documents') or []

        required_user = ['email', 'phone_number', 'password']
        for f in required_user:
            if not user_data.get(f):
                return JsonResponse({'success': False, 'error': f'Missing user field: {f}'}, status=400)

        if user_data.get('role') != 'rider':
            user_data['role'] = 'rider'

        with transaction.atomic():
            username = user_data.get('username') or user_data.get('email')
            from django.utils.dateparse import parse_date

            user = User.objects.create_user(
                email=user_data.get('email'),
                phone_number=user_data.get('phone_number'),
                password=user_data.get('password'),
                username=username,
                role='customer',
                first_name=user_data.get('first_name') or rider_data.get('first_name') or '',
                last_name=user_data.get('last_name') or rider_data.get('last_name') or '',
                status=User.UserStatus.PENDING,
            )

            dob_raw = rider_data.get('date_of_birth')
            dob = None
            if isinstance(dob_raw, str):
                dob = parse_date(dob_raw)
            elif isinstance(dob_raw, (int, float)):
                try:
                    import datetime
                    ts = int(dob_raw)
                    if ts > 10_000_000_000:
                        ts = ts / 1000
                    dob = datetime.date.fromtimestamp(ts)
                except Exception:
                    dob = None
            elif hasattr(dob_raw, 'year'):
                dob = dob_raw

            if dob is None:
                return JsonResponse({'success': False, 'error': 'Invalid or missing rider.date_of_birth (YYYY-MM-DD)'}, status=400)

            if not rider_data.get('gender'):
                return JsonResponse({'success': False, 'error': 'Missing rider.gender'}, status=400)
            if not rider_data.get('vehicle_type'):
                return JsonResponse({'success': False, 'error': 'Missing rider.vehicle_type'}, status=400)

            rider = Rider.objects.create(
                user=user,
                first_name=rider_data.get('first_name') or user.first_name,
                last_name=rider_data.get('last_name') or user.last_name,
                middle_name=rider_data.get('middle_name') or None,
                date_of_birth=dob,
                gender=rider_data.get('gender'),
                vehicle_type=rider_data.get('vehicle_type'),
                vehicle_brand=rider_data.get('vehicle_brand') or None,
                vehicle_model=rider_data.get('vehicle_model') or None,
                plate_number=rider_data.get('plate_number') or None,
                vehicle_color=rider_data.get('vehicle_color') or None,
                drivers_license_uploaded=bool(rider_data.get('drivers_license_uploaded')),
            )

            user.role = 'rider'
            user.save(update_fields=['role'])

            for doc in documents:
                id_type_code = doc.get('id_type')
                file_url = doc.get('file_url')
                if not id_type_code or not file_url:
                    continue
                try:
                    id_type = ValidID.objects.get(name=id_type_code)
                except ValidID.DoesNotExist:
                    if id_type_code == 'drivers_license':
                        id_type = ValidID.objects.create(name='drivers_license', category='primary', description='Driver\'s License')
                    else:
                        continue
                UserDocument.objects.create(
                    user=user,
                    id_type=id_type,
                    file_url=file_url,
                    document_file=file_url,
                    status=UserDocument.DocumentStatus.PENDING,
                )

        return JsonResponse({'success': True, 'user_id': user.id})
    except Exception as e:
        return JsonResponse({'success': False, 'error': 'Registration failed', 'message': str(e)}, status=500)


@csrf_exempt
def approve_pharmacy(request, pharmacy_id):
    """Approve pharmacy endpoint that updates status and verification"""
    if request.method != 'POST':
        return JsonResponse({
            'error': 'Method not allowed',
            'message': 'Only POST requests are allowed'
        }, status=405)

    try:
        from api.users.models import Pharmacy, User, TemporaryLoginToken
        from django.utils import timezone
        from api.utils.email_utils import send_pharmacy_welcome_email
        import secrets

        pharmacy = Pharmacy.objects.get(id=pharmacy_id)

        if pharmacy.status == 'approved' and pharmacy.is_fully_verified:
            return JsonResponse({
                'error': 'Pharmacy already approved',
                'message': f'Pharmacy {pharmacy.pharmacy_name} is already approved and verified'
            }, status=400)

        try:
            admin_user = User.objects.filter(role='admin', is_superuser=True).first()
            if not admin_user:
                admin_user = User.objects.create_user(
                    email='admin@pharmago.com',
                    password='admin123',
                    role='admin',
                    is_staff=True,
                    is_superuser=True,
                    first_name='System',
                    last_name='Admin',
                )
        except Exception as e:
            print(f"ERROR creating admin user: {e}")
            admin_user = None

        pharmacy.status = 'approved'
        pharmacy.is_fully_verified = True
        pharmacy.verified_at = timezone.now()
        pharmacy.verified_by = admin_user
        pharmacy.save()

        pharmacy.user.status = 'active'
        pharmacy.user.save()

        token = secrets.token_urlsafe(48)
        expires_at = timezone.now() + timezone.timedelta(hours=48)

        login_token = TemporaryLoginToken.objects.create(
            user=pharmacy.user,
            token=token,
            expires_at=expires_at,
        )

        email_sent = send_pharmacy_welcome_email(pharmacy, login_token)

        print(f"=== PHARMACY APPROVED ===")
        print(f"Pharmacy ID: {pharmacy.id}")
        print(f"Pharmacy Name: {pharmacy.pharmacy_name}")
        print(f"Owner: {pharmacy.owner_first_name} {pharmacy.owner_last_name}")
        print(f"Business Email: {pharmacy.business_email}")
        print(f"Approved by: {admin_user.get_full_name() if admin_user else 'System'}")
        print(f"Approved at: {pharmacy.verified_at}")
        print(f"Login Token Generated: {token}")
        print(f"Token Expires: {expires_at}")
        print(f"Welcome Email Sent: {'Yes' if email_sent else 'No'}")
        print("=== END PHARMACY APPROVAL ===")

        return JsonResponse({
            'success': True,
            'message': f'Pharmacy {pharmacy.pharmacy_name} has been successfully approved',
            'pharmacy_id': pharmacy.id,
            'pharmacy_name': pharmacy.pharmacy_name,
            'business_email': pharmacy.business_email,
            'verified_at': pharmacy.verified_at.isoformat(),
            'verified_by': admin_user.get_full_name() if admin_user else 'System Admin',
            'login_token_generated': True,
            'token_expires_at': expires_at.isoformat(),
            'welcome_email_sent': email_sent,
            'email_status': 'sent' if email_sent else 'failed',
        })
    except Pharmacy.DoesNotExist:
        print(f"ERROR: Pharmacy with ID {pharmacy_id} not found")
        return JsonResponse({
            'error': 'Pharmacy not found',
            'message': f'No pharmacy found with ID {pharmacy_id}'
        }, status=404)
    except Exception as e:
        print(f"ERROR in approve_pharmacy: {e}")
        return JsonResponse({
            'error': 'Failed to approve pharmacy',
            'message': 'An error occurred while approving the pharmacy. Please try again.'
        }, status=500)


@csrf_exempt
def generate_login_token(request, pharmacy_id):
    """Generate a temporary login token for pharmacy first-time setup"""
    if request.method != 'POST':
        return JsonResponse({
            'error': 'Method not allowed',
            'message': 'Only POST requests are allowed'
        }, status=405)

    try:
        from api.users.models import Pharmacy, TemporaryLoginToken
        from django.utils import timezone
        import secrets

        pharmacy = Pharmacy.objects.get(id=pharmacy_id)

        if pharmacy.status != 'approved' or not pharmacy.is_fully_verified:
            return JsonResponse({
                'error': 'Pharmacy not approved',
                'message': 'Pharmacy must be approved before generating login token'
            }, status=400)

        token = secrets.token_urlsafe(48)
        expires_at = timezone.now() + timezone.timedelta(hours=48)

        login_token = TemporaryLoginToken.objects.create(
            user=pharmacy.user,
            token=token,
            expires_at=expires_at,
        )

        print(f"=== LOGIN TOKEN GENERATED ===")
        print(f"Pharmacy ID: {pharmacy.id}")
        print(f"Pharmacy Name: {pharmacy.pharmacy_name}")
        print(f"User ID: {pharmacy.user.id}")
        print(f"Token: {token}")
        print(f"Expires at: {expires_at}")
        print("=== END TOKEN GENERATION ===")

        return JsonResponse({
            'success': True,
            'message': 'Login token generated successfully',
            'token': token,
            'expires_at': expires_at.isoformat(),
            'pharmacy_id': pharmacy.id,
            'pharmacy_name': pharmacy.pharmacy_name,
            'business_email': pharmacy.business_email,
        })
    except Pharmacy.DoesNotExist:
        print(f"ERROR: Pharmacy with ID {pharmacy_id} not found")
        return JsonResponse({
            'error': 'Pharmacy not found',
            'message': f'No pharmacy found with ID {pharmacy_id}'
        }, status=404)
    except Exception as e:
        print(f"ERROR in generate_login_token: {e}")
        return JsonResponse({
            'error': 'Failed to generate login token',
            'message': 'An error occurred while generating the login token. Please try again.'
        }, status=500)


def validate_login_token(request, token):
    """Validate a temporary login token"""
    if request.method != 'GET':
        return JsonResponse({
            'error': 'Method not allowed',
            'message': 'Only GET requests are allowed'
        }, status=405)

    try:
        from api.users.models import TemporaryLoginToken, Pharmacy

        login_token = TemporaryLoginToken.objects.get(token=token)

        if not login_token.is_valid():
            if login_token.is_expired():
                return JsonResponse({
                    'error': 'Token expired',
                    'message': 'This login link has expired. Please contact support for a new link.'
                }, status=400)
            elif login_token.is_used:
                return JsonResponse({
                    'error': 'Token already used',
                    'message': 'This login link has already been used. Please contact support for a new link.'
                }, status=400)

        try:
            pharmacy = Pharmacy.objects.get(user=login_token.user)
        except Pharmacy.DoesNotExist:
            return JsonResponse({
                'error': 'Pharmacy not found',
                'message': 'No pharmacy found for this user'
            }, status=404)

        print(f"=== LOGIN TOKEN VALIDATED ===")
        print(f"Token: {token}")
        print(f"Pharmacy ID: {pharmacy.id}")
        print(f"Pharmacy Name: {pharmacy.pharmacy_name}")
        print(f"User ID: {login_token.user.id}")
        print(f"Expires at: {login_token.expires_at}")
        print("=== END TOKEN VALIDATION ===")

        return JsonResponse({
            'success': True,
            'message': 'Token is valid',
            'token': token,
            'pharmacy_id': pharmacy.id,
            'pharmacy_name': pharmacy.pharmacy_name,
            'business_email': pharmacy.business_email,
            'pharmacy_email': pharmacy.business_email,
            'owner_name': f"{pharmacy.owner_first_name} {pharmacy.owner_last_name}",
            'expires_at': login_token.expires_at.isoformat(),
        })
    except TemporaryLoginToken.DoesNotExist:
        print(f"ERROR: Token {token} not found")
        return JsonResponse({
            'error': 'Invalid token',
            'message': 'This login link is invalid. Please check the link or contact support.'
        }, status=404)
    except Exception as e:
        print(f"ERROR in validate_login_token: {e}")
        return JsonResponse({
            'error': 'Failed to validate token',
            'message': 'An error occurred while validating the token. Please try again.'
        }, status=500)


@csrf_exempt
def pharmacy_login(request):
    """Legacy-compatible pharmacy login endpoint at /api/pharmacy-login/.

    Accepts JSON body: { "email"|"username", "password" }
    Returns JWT tokens and basic user info if the account has role == 'pharmacy'.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        import json
        from .authentication import CustomAuthenticationBackend
        from .models import User, Pharmacy
        from .jwt_views import token_manager

        try:
            payload = json.loads(request.body or '{}')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON body'}, status=400)

        identifier = (payload.get('email') or payload.get('username') or '').strip()
        password = (payload.get('password') or '').strip()
        if not identifier or not password:
            return JsonResponse({'error': 'email/username and password are required'}, status=400)

        auth_backend = CustomAuthenticationBackend()
        user = auth_backend.authenticate(request, username=identifier, password=password)
        if not user:
            return JsonResponse({'error': 'Invalid credentials'}, status=401)

        if user.role != User.UserRole.PHARMACY:
            return JsonResponse({'error': 'Only pharmacy accounts may log in here'}, status=403)

        tokens = token_manager.create_tokens(user)
        # Resolve pharmacy info for this user
        pharmacy_obj = None
        try:
            pharmacy_obj = Pharmacy.objects.get(user=user)
        except Pharmacy.DoesNotExist:
            pharmacy_obj = None
        user.last_login = __import__('django.utils').utils.timezone.now()
        user.save(update_fields=['last_login'])

        return JsonResponse({
            'success': True,
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'email': user.email,
                'phone_number': user.phone_number,
                'role': user.role,
                'status': user.status,
            },
            'pharmacy': ({
                'id': pharmacy_obj.id,
                'name': getattr(pharmacy_obj, 'pharmacy_name', ''),
                'pharmacy_name': getattr(pharmacy_obj, 'pharmacy_name', ''),
            } if pharmacy_obj else None),
            'tokens': tokens,
        })
    except Exception as e:
        return JsonResponse({'error': 'Login failed', 'message': str(e)}, status=500)



@csrf_exempt
def complete_user_setup(request, token):
    """Complete initial user setup (set username/password) using a valid login token.

    POST body: { "username": str, "password": str }
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed', 'message': 'Only POST requests are allowed'}, status=405)

    try:
        import json
        payload = json.loads(request.body or '{}')
        desired_username = (payload.get('username') or '').strip()
        new_password = (payload.get('password') or '').strip()

        if not desired_username or not new_password:
            return JsonResponse({'success': False, 'message': 'username and password are required'}, status=400)

        from api.users.models import TemporaryLoginToken, User, Pharmacy
        from .security import PasswordValidator

        # Locate token and validate
        try:
            login_token = TemporaryLoginToken.objects.get(token=token)
        except TemporaryLoginToken.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Invalid or expired token'}, status=404)

        if not login_token.is_valid():
            return JsonResponse({'success': False, 'message': 'Invalid or expired token'}, status=400)

        user = login_token.user

        # Ensure user is a pharmacy account
        if user.role != User.UserRole.PHARMACY:
            return JsonResponse({'success': False, 'message': 'This setup link is only for pharmacy accounts'}, status=403)

        # Validate password strength
        PasswordValidator().validate(new_password, user=user)

        # Ensure username uniqueness if provided
        if desired_username:
            existing = User.objects.filter(username=desired_username).exclude(id=user.id).exists()
            if existing:
                return JsonResponse({'success': False, 'message': 'Username is already taken'}, status=400)

        # Apply username/password and activate account
        if desired_username:
            user.username = desired_username
        user.set_password(new_password)
        user.status = User.UserStatus.ACTIVE
        user.is_email_verified = True if user.email else user.is_email_verified
        user.save()

        # Mark token used
        login_token.mark_as_used()

        # Bring basic pharmacy context
        ph = None
        try:
            ph = Pharmacy.objects.get(user=user)
        except Pharmacy.DoesNotExist:
            ph = None

        return JsonResponse({
            'success': True,
            'message': 'Account setup complete',
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'role': user.role,
                'status': user.status,
            },
            'pharmacy': ({
                'id': ph.id,
                'pharmacy_name': getattr(ph, 'pharmacy_name', ''),
                'name': getattr(ph, 'pharmacy_name', ''),
                'business_email': getattr(ph, 'business_email', ''),
                'business_phone': getattr(ph, 'business_phone', ''),
                'city': getattr(ph, 'city', ''),
                'province': getattr(ph, 'province', ''),
            } if ph else None)
        })
    except ValidationError as ve:  # from PasswordValidator
        try:
            messages = ve.messages if hasattr(ve, 'messages') else [str(ve)]
        except Exception:
            messages = [str(ve)]
        return JsonResponse({'success': False, 'message': messages[0]}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': 'Setup failed. Please try again.'}, status=500)


@csrf_exempt
def pharmacy_register(request):
    """Direct endpoint to register a pharmacy without authentication (multipart form).

    Accepts multipart/form-data with fields aligned to PharmacyRegistrationSerializer
    including optional file uploads (e.g., pharmacy_license_file, business_permit_file,
    owner_primary_id_file, storefront_image_file). JSON fields such as operating_hours,
    services_offered, and payment_methods_accepted may be provided as JSON strings.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed', 'message': 'Only POST requests are allowed'}, status=405)

    try:
        from .serializers import PharmacyRegistrationSerializer
        import json

        # Build data dict from POST with conversions
        raw = request.POST.copy()

        # Coerce JSON fields if provided as strings
        json_fields = ['operating_hours', 'services_offered', 'payment_methods_accepted']
        data = {}
        for k, v in raw.items():
            if k in json_fields:
                try:
                    data[k] = json.loads(v) if isinstance(v, str) else v
                except Exception:
                    # Leave as-is; serializer will raise friendly error
                    data[k] = v
            elif k.endswith('_uploaded'):
                lv = str(v).strip().lower()
                data[k] = True if lv in ('1', 'true', 'yes', 'on') else False
            else:
                data[k] = v

        # Attach file objects if present
        file_field_names = [
            'pharmacy_license_file',
            'business_permit_file',
            'owner_primary_id_file',
            'storefront_image_file',
        ]
        for fname in file_field_names:
            f = request.FILES.get(fname)
            if f is not None:
                data[fname] = f

        serializer = PharmacyRegistrationSerializer(data=data)
        if not serializer.is_valid():
            return JsonResponse({
                'error': 'Validation failed',
                'validation_errors': serializer.errors,
            }, status=400)

        pharmacy = serializer.save()
        return JsonResponse({
            'success': True,
            'message': 'Pharmacy registration submitted successfully',
            'pharmacy_id': pharmacy.id,
        }, status=201)
    except Exception as e:
        return JsonResponse({'error': 'Registration failed', 'message': str(e)}, status=500)
