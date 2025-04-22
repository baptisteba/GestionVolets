# Gestion Volets

Application web pour contrôler les volets via Home Assistant.

## Prérequis

- Docker
- Docker Compose

## Installation

1. Clonez ce dépôt :
```bash
git clone <repository-url>
cd gestion-volets
```

2. Démarrez l'application :
```bash
docker-compose up -d
```

L'application sera accessible à l'adresse : http://localhost:3157

## Configuration

1. Accédez à l'interface web
2. Cliquez sur l'icône des paramètres (⚙️)
3. Configurez :
   - URL de l'API Home Assistant (ex: http://homeassistantURL:8123)
   - Token d'accès longue durée Home Assistant

## Persistance des données

Les paramètres sont stockés dans le dossier `config/` qui est monté comme un volume Docker.

## Mise à jour

Pour mettre à jour l'application :

```bash
docker-compose down
docker-compose up -d --build
```

## Logs

Pour voir les logs de l'application :

```bash
docker-compose logs -f
```

Les logs sont également disponibles dans le dossier `logs/`.

## Notes importantes

- L'application utilise le mode réseau "host" pour accéder aux ressources Tailscale
- Cette configuration permet au conteneur d'accéder aux mêmes ressources réseau que l'hôte
- Les configurations sont persistantes grâce au volume monté dans ./config
- Assurez-vous que votre instance Home Assistant est accessible via l'URL configurée 
