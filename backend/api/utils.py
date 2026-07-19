import requests

def enviar_push(user, titulo, mensagem, dados=None):
    # Procura o token do utilizador no teu modelo PushToken
    if hasattr(user, 'push_token'):
        token = user.push_token.token
        
        url = "https://exp.host/--/api/v2/push/send"
        payload = {
            "to": token,
            "title": titulo,
            "body": mensagem,
            "data": dados or {},
            "sound": "default",
        }
        
        try:
            requests.post(url, json=payload, timeout=10)
        except Exception as e:
            print(f"Erro ao enviar push: {e}")