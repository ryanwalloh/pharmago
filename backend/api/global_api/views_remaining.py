# ============================================================================
# GLOBAL SEARCH VIEWSET
# ============================================================================

class GlobalSearchViewSet(viewsets.ViewSet):
    """ViewSet for global search across all models"""
    
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def search(self, request):
        """Perform global search across all searchable models"""
        start_time = time.time()
        
        serializer = GlobalSearchSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        query = data['query']
        models_to_search = data.get('models', [])
        search_type = data['search_type']
        limit = data['limit']
        include_inactive = data['include_inactive']
        
        # Define searchable models and their search fields
        searchable_models = {
            'users.User': {
                'fields': ['username', 'email', 'first_name', 'last_name'],
                'label': 'Users'
            },
            'users.Customer': {
                'fields': ['user__username', 'user__email', 'phone_number'],
                'label': 'Customers'
            },
            'users.Pharmacy': {
                'fields': ['user__username', 'user__email', 'business_name', 'license_number'],
                'label': 'Pharmacies'
            },
            'users.Rider': {
                'fields': ['user__username', 'user__email', 'vehicle_number'],
                'label': 'Riders'
            },
            'inventory.MedicineCatalog': {
                'fields': ['name', 'generic_name', 'manufacturer', 'description'],
                'label': 'Medicines'
            },
            'inventory.MedicineCategory': {
                'fields': ['name', 'description'],
                'label': 'Medicine Categories'
            },
            'orders.Order': {
                'fields': ['order_number', 'status'],
                'label': 'Orders'
            },
            'pharmacies.Pharmacy': {
                'fields': ['business_name', 'license_number', 'address'],
                'label': 'Pharmacy Profiles'
            }
        }
        
        # Filter models if specific ones requested
        if models_to_search:
            searchable_models = {k: v for k, v in searchable_models.items() 
                               if k in models_to_search}
        
        results_by_model = []
        total_results = 0
        
        for model_path, config in searchable_models.items():
            try:
                app_label, model_name = model_path.split('.')
                model = apps.get_model(app_label, model_name)
                
                # Build search query
                search_filters = Q()
                for field in config['fields']:
                    if '__' in field:
                        # Handle related field searches
                        search_filters |= Q(**{f"{field}__{search_type}": query})
                    else:
                        search_filters |= Q(**{f"{field}__{search_type}": query})
                
                # Apply filters and get results
                queryset = model.objects.filter(search_filters)
                
                # Exclude inactive records if requested
                if not include_inactive:
                    if hasattr(model, 'is_active'):
                        queryset = queryset.filter(is_active=True)
                    elif hasattr(model, 'status'):
                        queryset = queryset.exclude(status='inactive')
                
                # Limit results
                model_results = list(queryset[:limit].values())
                
                # Add model info to results
                for result in model_results:
                    result['_model'] = model_name
                    result['_model_label'] = config['label']
                
                results_by_model.append({
                    'model_name': model_name,
                    'model_label': config['label'],
                    'results': model_results,
                    'total_count': queryset.count(),
                    'execution_time': 0  # Will be calculated per model
                })
                
                total_results += len(model_results)
                
            except Exception as e:
                # Log error and continue with other models
                continue
        
        # Calculate execution time
        execution_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Log the search
        search_log = GlobalSearchLog.objects.create(
            user=request.user,
            search_type='cross_model',
            query=query,
            models_searched=list(searchable_models.keys()),
            results_count=total_results,
            execution_time=execution_time,
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        # Prepare response
        response_data = {
            'query': query,
            'total_results': total_results,
            'execution_time': round(execution_time, 2),
            'results_by_model': results_by_model,
            'search_log_id': search_log.id
        }
        
        serializer = GlobalSearchResponseSerializer(response_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def searchable_models(self, request):
        """Get list of searchable models"""
        searchable_models = {
            'users.User': 'Users',
            'users.Customer': 'Customers',
            'users.Pharmacy': 'Pharmacies',
            'users.Rider': 'Riders',
            'inventory.MedicineCatalog': 'Medicines',
            'inventory.MedicineCategory': 'Medicine Categories',
            'orders.Order': 'Orders',
            'pharmacies.Pharmacy': 'Pharmacy Profiles'
        }
        
        return Response({
            'searchable_models': searchable_models,
            'total_models': len(searchable_models)
        })


# ============================================================================
# BULK OPERATIONS VIEWSET
# ============================================================================

class BulkOperationsViewSet(viewsets.ViewSet):
    """ViewSet for bulk operations across all models"""
    
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Perform bulk create operation"""
        start_time = time.time()
        
        serializer = BulkCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        model_name = data['model_name']
        items_data = data['data']
        batch_size = data['batch_size']
        
        try:
            # Get the model
            app_label, model_name_short = model_name.split('.')
            model = apps.get_model(app_label, model_name_short)
            
            # Create bulk operation log
            bulk_log = BulkOperationLog.objects.create(
                user=request.user,
                operation_type='create',
                model_name=model_name,
                total_items=len(items_data),
                status='processing'
            )
            
            created_objects = []
            failed_items = []
            
            # Process items in batches
            for i in range(0, len(items_data), batch_size):
                batch = items_data[i:i + batch_size]
                
                try:
                    with transaction.atomic():
                        batch_objects = []
                        for item_data in batch:
                            try:
                                obj = model.objects.create(**item_data)
                                batch_objects.append(obj)
                            except Exception as e:
                                failed_items.append({
                                    'data': item_data,
                                    'error': str(e)
                                })
                        
                        created_objects.extend(batch_objects)
                        bulk_log.processed_items += len(batch)
                        bulk_log.successful_items += len(batch_objects)
                        
                except Exception as e:
                    # Log batch error
                    failed_items.append({
                        'batch_start': i,
                        'batch_end': min(i + batch_size, len(items_data)),
                        'error': str(e)
                    })
            
            # Update bulk operation log
            execution_time = time.time() - start_time
            bulk_log.failed_items = len(failed_items)
            bulk_log.error_details = {'failed_items': failed_items}
            bulk_log.mark_completed(execution_time)
            
            return Response({
                'message': f'Bulk create completed for {model_name}',
                'total_items': len(items_data),
                'successful_items': len(created_objects),
                'failed_items': len(failed_items),
                'bulk_operation_id': bulk_log.id,
                'execution_time': round(execution_time, 2)
            })
            
        except Exception as e:
            return Response({
                'error': f'Bulk create failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Perform bulk update operation"""
        start_time = time.time()
        
        serializer = BulkUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        model_name = data['model_name']
        update_data = data['data']
        filters = data['filters']
        batch_size = data['batch_size']
        
        try:
            # Get the model
            app_label, model_name_short = model_name.split('.')
            model = apps.get_model(app_label, model_name_short)
            
            # Apply filters to get queryset
            queryset = model.objects.filter(**filters)
            total_items = queryset.count()
            
            # Create bulk operation log
            bulk_log = BulkOperationLog.objects.create(
                user=request.user,
                operation_type='update',
                model_name=model_name,
                total_items=total_items,
                status='processing'
            )
            
            updated_count = 0
            failed_items = []
            
            # Process updates in batches
            for i in range(0, total_items, batch_size):
                batch_queryset = queryset[i:i + batch_size]
                
                try:
                    with transaction.atomic():
                        batch_updated = batch_queryset.update(**update_data)
                        updated_count += batch_updated
                        bulk_log.processed_items += len(batch_queryset)
                        bulk_log.successful_items += batch_updated
                        
                except Exception as e:
                    failed_items.append({
                        'batch_start': i,
                        'batch_end': min(i + batch_size, total_items),
                        'error': str(e)
                    })
            
            # Update bulk operation log
            execution_time = time.time() - start_time
            bulk_log.failed_items = len(failed_items)
            bulk_log.error_details = {'failed_items': failed_items}
            bulk_log.mark_completed(execution_time)
            
            return Response({
                'message': f'Bulk update completed for {model_name}',
                'total_items': total_items,
                'updated_items': updated_count,
                'failed_items': len(failed_items),
                'bulk_operation_id': bulk_log.id,
                'execution_time': round(execution_time, 2)
            })
            
        except Exception as e:
            return Response({
                'error': f'Bulk update failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """Perform bulk delete operation"""
        start_time = time.time()
        
        serializer = BulkDeleteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        model_name = data['model_name']
        filters = data['filters']
        batch_size = data['batch_size']
        
        try:
            # Get the model
            app_label, model_name_short = model_name.split('.')
            model = apps.get_model(app_label, model_name_short)
            
            # Apply filters to get queryset
            queryset = model.objects.filter(**filters)
            total_items = queryset.count()
            
            # Create bulk operation log
            bulk_log = BulkOperationLog.objects.create(
                user=request.user,
                operation_type='delete',
                model_name=model_name,
                total_items=total_items,
                status='processing'
            )
            
            deleted_count = 0
            failed_items = []
            
            # Process deletes in batches
            for i in range(0, total_items, batch_size):
                batch_queryset = queryset[i:i + batch_size]
                
                try:
                    with transaction.atomic():
                        batch_deleted = batch_queryset.delete()[0]
                        deleted_count += batch_deleted
                        bulk_log.processed_items += len(batch_queryset)
                        bulk_log.successful_items += batch_deleted
                        
                except Exception as e:
                    failed_items.append({
                        'batch_start': i,
                        'batch_end': min(i + batch_size, total_items),
                        'error': str(e)
                    })
            
            # Update bulk operation log
            execution_time = time.time() - start_time
            bulk_log.failed_items = len(failed_items)
            bulk_log.error_details = {'failed_items': failed_items}
            bulk_log.mark_completed(execution_time)
            
            return Response({
                'message': f'Bulk delete completed for {model_name}',
                'total_items': total_items,
                'deleted_items': deleted_count,
                'failed_items': len(failed_items),
                'bulk_operation_id': bulk_log.id,
                'execution_time': round(execution_time, 2)
            })
            
        except Exception as e:
            return Response({
                'error': f'Bulk delete failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
