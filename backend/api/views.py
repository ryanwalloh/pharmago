from django.shortcuts import render

from django.http import JsonResponse

def ping(request):
    return JsonResponse({"message": "pong"})

