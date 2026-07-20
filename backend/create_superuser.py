import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

USERNAME = "andre_dev"
EMAIL = "andre@nzilaplus.com"
PASSWORD = "sakimadeço2000"

if not User.objects.filter(username=USERNAME).exists():
    User.objects.create_superuser(
        username=USERNAME,
        email=EMAIL,
        password=PASSWORD,
    )
    print("✅ Superusuário criado com sucesso.")
else:
    print("ℹ️ O superusuário já existe.")