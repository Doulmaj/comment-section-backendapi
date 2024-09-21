# comment section api

Cette API est une api de Gestion des Utilisateurs permet de gérer les utilisateurs de votre application. Vous pouvez créer, lire, mettre à jour des utilisateurs, de se connecter pour envoyer des messages et des réponses à d'autres messages puis de liker ou disliker un message et enfin se deconnecter.

**Pré-requis**
Pour exécuter cette api veuillez d'abord créer une base de données sql puis ensuite suivre les requêtes sql de création de table qui figurent le dossier `mysql_databases` ensuite remplir les informations de connexion à la base de données dans le fichier 'env.model.txt', puis ensuite le renommer en '.env'.
Au cas où vous changer le port par défaut qui est 8080, veuillez en tenir compte dans vos endpoints
Pour lancer l'api, il faut taper la commande : `npx nodemon index.js`.

**URL de base** : `https://localhost:8080/`

## Authentification

L'API utilise des tokens pour l'authentification des utilisateurs. Incluez votre token dans l'en-tête de chaque requête.

**Exemple d'en-tête** : Authorization: Bearer YOUR_TOKEN

## End-points

### Créer un utilisateur

**URL** : `http://localhost:8080/users/register`  
**Méthode HTTP** : `POST`  
**Description** : Crée un nouvel utilisateur.

**Paramètres de requête** :  
**_Body : form-data (presence d'image )_**

-   `username` (string) : (obligatoire) Le nom de l'utilisateur. Il doit comprendre entre 3 à 100 caractères.
-   `email` (string) : (obligatoire) L'adresse email de l'utilisateur.
-   `password` (string) : (obligatoire) Le mot de passe de l'utilisateur. Le mot de passe doit comporter au moins 8 caractères, incluant au moins une lettre minuscule, une lettre majuscule, un caractère spécial et au moins un chiffre.
-   `description` (string) : (facultatif) La description de l'utilisateur
-   `image` (file) : (facultatif) Il s'agit de l'image en format jpg, jpeg ou png qui sera l'image de profil de l'utilisateur

**Exemple de réponse** :

```json
{
    "message": "user added succesfully",
    "userId": 1
}
```

### Créer une session utilisatrice et se connecter

**URL** : `http://localhost:8080/users/login`  
**Méthode HTTP** : `POST`  
**Description** : Créer un session utilisatrice et recevoir son token de connexion valide pour 1h. Cependant, si une session est déjà en cours cette dernière sera annulé avant de créer une nouvelle session

**Paramètres de requête** :  
**_Body : x-www-form-urlencoded_**

-   `username` (string) : (obligatoire) Le nom de l'utilisateur.
-   `password` (string) : (obligatoire) Le mot de passe de l'utilisateur.

**Exemple de réponse** :

```json
{
    "token": "token"
}
```

### Recueillir les informations d'un profil utilisateur

**URL** : `http://localhost:8080/users/profil`  
**Méthode HTTP** : `GET`  
**Description** : récupère le profil utilisateur.

**Paramètres de requête** :  
**_Headers_**

-   `authorization`(string) : (obligatoire) Saisir votre token sous la forme (Bearer VOTRE_TOKEN)  
    **Exemple de réponse** :

```json
{
    "username": "test",
    "email": "test@gmail.com",
    "description": "",
    "profil": "",
    "isAdmin": 0
}
```

### Mettre à jour son profil utilisateur

**URL** : `http://localhost:8080/users/profil`  
**Méthode HTTP** : `PUT`  
**Description** : met à jour le profil utilisateur. Il permet de changer l'email, la description et la photo de profil de l'utilisateur. Cependant au moins un champ du body de la requête ne doit pas être vide.

**Paramètres de requête** :  
**_Headers_**

-   `authorization`(string) : (obligatoire) Saisir votre token sous la forme (Bearer VOTRE_TOKEN)

**_Body : form-data_**  
Champ modifiable :

-   `email`(string) : email de l'utilisateur,
-   `description` (string): description de l'utilisateur,
-   `profil` (file): la photo de profil de l'utilisateur.

**Exemple de réponse** :

```json
{
    "message": "user profile has been updated"
}
```

### Mettre fin à sa session utilisatrice

**URL** : `http://localhost:8080/users/logout`  
**Méthode HTTP** : `POST`  
**Description** : déconnecte l'utilisateur.

**Paramètres de requête** :  
**_Headers_**

-   `authorization`(string) : (obligatoire) Saisir votre token sous la forme (Bearer VOTRE_TOKEN)

    **Exemple de réponse** :

```json
{
    "message": "Successful log out"
}
```

### Envoyer un message

**URL** : `http://localhost:8080/messages/new`  
**Méthode HTTP** : `POST`  
**Description** : envoie un message générale.

**Paramètres de requête** :  
**_Headers_**

-   `authorization`(string) : (obligatoire) Saisir votre token sous la forme (Bearer VOTRE_TOKEN)

**_Body : form-data_**

-   `elements` (tableau) : (obligatoire) elements est un tableau d'objets { type: 'text' | 'image', content: string }; elements fait office d'inventaire du contenu du message. il permet de ranger dans l'ordre du haut vers le bas, le texte et le(s) image(s) saisis par l'utilisateur.
    Pour du texte simple, il faut utiliser l'objet { type: 'text', content: string }, content doit contenir le texte saisi par l'utilisateur.
    Pour une image, il faut utiliser l'objet { type: 'text', content: string }, content dans ce cas doit contenir le nom de l'image chargé.

    **_*Exemples de présentation de elements*_**

    elements : [
    { "type": "text", "content": "Salut, comment allez-vous ?." },
    {"type":"image", "content":"116983-1717795959.4608-scaled.jpg"},
    { "type": "text", "content": "Voici le deuxième paragraphe." },
    {"type":"image", "content":"116983-1717795959.4608-scaled.jpg"}
    ]

-   `images` (files) : (obligatoire si le champ 'elements' contient un objet dont le 'type' est 'image'), ce champ est fait pour uploader les images contenu dans le message. Les formats supportés: jpg, jpeg, png, gif.

    **Exemple de réponse** :

```json
{
    "message": "Message uploaded succesfully"
}
```

### Répondre à un message spécifique

**URL** : `http://localhost:8080/messages/:id/reply`  
**Méthode HTTP** : `POST`  
**Description** : permet de répondre à un message doit l'identifiant (id) est indiqué dans l'url de la requête.

**Paramètres de requête** :

Les paramètres de cette requête sont les mêmes que celles de la requête d'envoie de message (sur l'endpoint http://localhost:8080/messages/new ) décrit juste plus haut.

**Exemple de réponse** :

```json
{
    "message": "Your answer has been uploaded"
}
```

### Pour récupérer tous les messages

**URL** : `http://localhost:8080/messages/all`  
**Méthode HTTP** : `GET`  
**Description** : permet de recevoir tous les messages dans la base de données.

**Paramètres de requête** :  
Aucun paramètres n'est requis, même pas de token

**Exemple de réponse** :

```json
{
    "messages": [
        {
            "message": "message retrieved successfully",
            "content": [
                {
                    "type": "text",
                    "content": "Salut, comment allez-vous ?."
                },
                {
                    "type": "image",
                    "content": "http://localhost:8080/databases/messagesImages/116983-1717795959.4608-scaled.jpg1726413979888.jpg"
                },
                {
                    "type": "text",
                    "content": "Voici le deuxième paragraphe."
                },
                {
                    "type": "image",
                    "content": "http://localhost:8080/databases/messagesImages/aesi_by_clint_cearley_by_clintcearley_dflglhp-350t-2x.jpg1726413979897.jpg"
                }
            ],
            "likes": 0,
            "dislikes": 0,
            "sender": "test",
            "replyTo": null,
            "id": 33
        },
        {
            "message": "message retrieved successfully",
            "content": [
                {
                    "type": "text",
                    "content": "Salut, comment allez-vous ?."
                },
                {
                    "type": "image",
                    "content": "http://localhost:8080/databases/messagesImages/116983-1717795959.4608-scaled.jpg1726414054035.jpg"
                },
                {
                    "type": "text",
                    "content": "Voici le deuxième paragraphe."
                },
                {
                    "type": "image",
                    "content": "http://localhost:8080/databases/messagesImages/aesi_by_clint_cearley_by_clintcearley_dflglhp-350t-2x.jpg1726414054043.jpg"
                }
            ],
            "likes": 0,
            "dislikes": 0,
            "sender": "test",
            "replyTo": 32,
            "id": 34
        },
        {
            "message": "message retrieved successfully",
            "content": [
                {
                    "type": "text",
                    "content": "Salut, comment allez-vous ?."
                },
                {
                    "type": "image",
                    "content": "http://localhost:8080/databases/messagesImages/116983-1717795959.4608-scaled.jpg1726414354352.jpg"
                },
                {
                    "type": "text",
                    "content": "Voici le deuxième paragraphe."
                },
                {
                    "type": "image",
                    "content": "http://localhost:8080/databases/messagesImages/aesi_by_clint_cearley_by_clintcearley_dflglhp-350t-2x.jpg1726414354369.jpg"
                }
            ],
            "likes": 0,
            "dislikes": 0,
            "sender": "test",
            "replyTo": 32,
            "id": 35
        },
        {
            "message": "message retrieved successfully",
            "content": [
                {
                    "type": "text",
                    "content": "Salut, comment allez-vous ?."
                },
                {
                    "type": "image",
                    "content": "http://localhost:8080/databases/messagesImages/116983-1717795959.4608-scaled.jpg1726699200719.jpg"
                },
                {
                    "type": "text",
                    "content": "Voici le deuxième paragraphe."
                },
                {
                    "type": "image",
                    "content": "http://localhost:8080/databases/messagesImages/aesi_by_clint_cearley_by_clintcearley_dflglhp-350t-2x.jpg1726699200733.jpg"
                }
            ],
            "likes": 0,
            "dislikes": 0,
            "sender": "test",
            "replyTo": 32,
            "id": 37
        }
    ]
}
```

### Pour récupérer un message

**URL** : `http://localhost:8080/messages/:id/specific`  
**Méthode HTTP** : `GET`  
**Description** : permet de recupérer un message dont on connait l'identifiant (id) dans la base de données dans la base de données. l'id d'un message est indiqué dans le cas d'une réponse.

**Paramètres de requête** :  
Aucun paramètres n'est requis, même pas de token

**Exemple de réponse** :

```json
{
    "message": "message retrieved successfully",
    "content": [
        {
            "type": "text",
            "content": "Salut, comment allez-vous ?."
        },
        {
            "type": "image",
            "content": "http://localhost:8080/databases/messagesImages/116983-1717795959.4608-scaled.jpg1726414354352.jpg"
        },
        {
            "type": "text",
            "content": "Voici le deuxième paragraphe."
        },
        {
            "type": "image",
            "content": "http://localhost:8080/databases/messagesImages/aesi_by_clint_cearley_by_clintcearley_dflglhp-350t-2x.jpg1726414354369.jpg"
        }
    ],
    "likes": 0,
    "dislikes": 0,
    "sender": "test",
    "replyTo": 32,
    "id": "35"
}
```

Les champs :

-   `content`: contient l'inventaires du contenu du message dans l'ordre du haut vers le bas.
-   `likes`: le nombre de likes qu'à obtenu le message
-   `dislikes`: le nombre de dislikes qu'à obtenu le message
-   `sender` : le nom de l'expéditeur du message
-   `replyTo`: l'identifant du message (id) auquel il répond
-   `id`: identifiant du message en question

### Pour liker un message

**URL** : `http://localhost:8080/messages/:id/like`  
**Méthode HTTP** : `POST`  
**Description** : permet de liker un message dont l'identifiant (id) apparait dans l'url de la requête.

**Paramètres de requête** :  
**_Headers_**

-   `authorization`(string) : (obligatoire) Saisir votre token sous la forme (Bearer VOTRE_TOKEN)

    **Exemple de réponse** :

```json
{
    "message": "Your like rection has been updated succesfully"
}
```

### Pour disliker un message

**URL** : `http://localhost:8080/messages/:id/dislike`  
**Méthode HTTP** : `POST`  
**Description** : permet de disliker un message dont l'identifiant (id) apparait dans l'url de la requête.

**Paramètres de requête** :  
**_Headers_**

-   `authorization`(string) : (obligatoire) Saisir votre token sous la forme (Bearer VOTRE_TOKEN)

    **Exemple de réponse** :

```json
{
    "message": "Your dislike rection has been updated succesfully"
}
```

### Pour annuler sa réaction un message

**URL** : `http://localhost:8080/messages/:id/nullify`  
**Méthode HTTP** : `POST`  
**Description** : permet d'annuler le like ou le dislike attribuer à un message dont l'identifiant (id) apparait dans l'url de la requête.

**Paramètres de requête** :  
**_Headers_**

-   `authorization`(string) : (obligatoire) Saisir votre token sous la forme (Bearer VOTRE_TOKEN)

    **Exemple de réponse** :

```json
{
    "message": "Your rection has been removed succesfully"
}
```

## Les types d'erreur lier au end-point

Les exemples de réponse décrits dans les end-points ne sont que les messages en cas de réussite de la requête. En cas de comportement inattendu, l'api peut retourner plusieurs types d'erreur suivie d'une description de l'erreur.
Ces erreurs sont des erreurs de status:
Code | Description
----------- | ---------------------
200 | Succès
400 | Requête invalide
401 | Non autorisé
500 | Erreur interne du serveur

## Stockage des données

### Base de donnée SQL

La base de donnée de l'API est composé des tables :

-   `users`: qui enregistre les données des utilisateurs.
-   `messages`: qui contient les informations relatifs au messages envoyés aux utlisateurs.
-   `message_elements`: qui contient les informations relatifs au contenu des messages.
-   `likes`: qui enregistre les réactions des utilisteurs(like, dislike).
-   `sessions`: qui permet d'enregistrer les informations au sessions utilisatrices.

### Images

Toutes les images chargés se retrouveront dans le dossiers `databases`.
