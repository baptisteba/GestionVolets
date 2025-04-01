# Gestion Volets Passman

Application web pour contrôler les volets via Home Assistant.

## Prérequis

- Docker
- Docker Compose
- Un réseau Docker nommé "homeassistant" (où se trouve votre instance Home Assistant)

## Installation

1. Clonez ce dépôt :
```bash
git clone <repository-url>
cd gestion-volets
```

2. Créez le réseau Docker si ce n'est pas déjà fait :
```bash
docker network create homeassistant
```

3. Démarrez l'application :
```bash
docker-compose up -d
```

L'application sera accessible à l'adresse : http://localhost:3157

## Configuration

1. Accédez à l'interface web
2. Cliquez sur l'icône des paramètres (⚙️)
3. Configurez :
   - URL de l'API Home Assistant (ex: http://homeassistant:8123)
   - Token d'accès longue durée Home Assistant

## Persistance des données

Les paramètres sont stockés dans le dossier `config/` qui est monté comme un volume Docker.

## Mise à jour

Pour mettre à jour l'application :

```bash
docker-compose pull
docker-compose up -d --build
```

## Logs

Pour voir les logs de l'application :

```bash
docker-compose logs -f
``` 