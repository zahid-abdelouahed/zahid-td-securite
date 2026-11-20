# Banque : sécuriser une appli de virement

Une micro-appli de virement : API **Spring Boot 4** (Java 25) et front **Angular**.
**Elle fonctionne, mais n'est pas sécurisée : n'importe qui peut tout faire.** Votre travail est de la protéger.

## Le métier en 30 secondes

- Un **client** a un **compte** et peut faire des **virements** (statut `EN_ATTENTE`).
- Un **conseiller** **valide** un virement (statut `VALIDE`) : l'argent part, et on garde qui l'a validé.

## Lancer

```
./gradlew bootRun                    # API sur http://localhost:8080
cd ui && npm install && npm start    # front sur http://localhost:4200
```

Base H2 en mémoire, console sur http://localhost:8080/h2-console (`jdbc:h2:mem:banque`).

## Les comptes de démo (définis dans `application.yml`)

| Login | Mot de passe | Rôle | Compte | Agence |
|---|---|---|---|---|
| `alice` | `alice123` | `CLIENT` | `FR76-0001` | Lyon Part-Dieu |
| `charles` | `charles123` | `CLIENT` | `FR76-0002` | Lyon Part-Dieu |
| `diane` | `diane123` | `CLIENT` | `FR76-0003` | Paris Opéra |
| `bruno` | `bruno123` | `CONSEILLER` | ceux de son agence | Lyon Part-Dieu |

Les mots de passe sont hachés en BCrypt avant d'aller en base. Ne touchez pas à `DonneesDemo`.

## API

| Méthode | URL | Rôle |
|---|---|---|
| GET | `/api/me` | l'utilisateur courant : `{login, roles}` (401 si personne) |
| GET | `/api/comptes` | les comptes |
| GET | `/api/comptes/{id}` | un compte (404 si absent) |
| GET | `/api/virements?compte={id}&page=0` | les virements d'un compte |
| POST | `/api/virements` | créer `{compteId, ibanDestinataire, montant}` (montant en centimes) |
| POST | `/api/virements/{id}/valider` | valider un virement (409 s'il l'est déjà) |

## Où est le code ?

```
utilisateur/   Utilisateur (login, hash, rôle), Client, Conseiller
  in/            MeController
  out/           UtilisateurCourant (qui fait la requête ?) et son faux
compte/        Compte, Agence, CompteService
virement/      Virement, VirementService
config/        CORS, données de démo
ui/            le front Angular
```

Le faux `UtilisateurCourantFake` répond « alice » à tout le monde. C'est lui que vous remplacerez.

## Avant de commencer : constatez

Sans rien configurer, lancez :

```
curl localhost:8080/api/comptes
curl -XPOST localhost:8080/api/virements/2/valider
```

Tout le monde voit tous les comptes, et **alice**, une simple cliente, vient de valider son propre virement.

## Partie 1 : Basic Auth sur Spring

1. Ajoutez `org.springframework.boot:spring-boot-starter-security`. Relancez : que renvoie maintenant l'API ?
2. Déclarez le bean `PasswordEncoder` (BCrypt) : c'est lui qui comparera le mot de passe reçu au hash en base.
3. Écrivez un `UserDetailsService` qui charge l'`Utilisateur` en base par son login.
4. Écrivez la `SecurityFilterChain` : Basic Auth, sans session (`STATELESS`), toutes les requêtes `/api/**` authentifiées.
5. Vérifiez avec `curl -u alice:alice123 localhost:8080/api/me`, puis décodez l'en-tête `Authorization: Basic …` (`echo … | base64 -d`). Est-ce du chiffrement ?
6. Remplacez `UtilisateurCourantFake` par un `UtilisateurCourant` qui lit le `SecurityContext`.
7. Le front reçoit une erreur CORS : le navigateur envoie un `OPTIONS` **sans** identifiants. Autorisez-le dans la chaîne (`.cors(...)`).

*Piège :* le CSRF est actif par défaut. Pour une API stateless en Basic Auth, que faut-il en faire, et pourquoi ?

## Partie 2 : Angular

1. Dans `AuthService`, implémentez `connecter` : appelez `GET /api/me` avec l'en-tête `Authorization: Basic …` (`btoa('login:motDePasse')`). Gardez les identifiants **en mémoire** et renseignez `utilisateur`.
2. Écrivez un **intercepteur** fonctionnel (`HttpInterceptorFn`) qui ajoute l'en-tête aux requêtes vers l'API. Sur un `401`, il déconnecte et renvoie vers `/login`.
3. Écrivez une **guard** (`CanActivateFn`) : sans utilisateur connecté, redirection vers `/login?retour=<url demandée>`. Appliquez-la aux routes `comptes`.
4. La page `/login` est fournie. Testez-la avec un mauvais mot de passe, puis rechargez la page connecté : que se passe-t-il, et pourquoi ?

## Partie 3 : les rôles

Règles à faire respecter **côté serveur** :

| Action | Qui |
|---|---|
| Valider un virement | un `CONSEILLER` seulement |
| Voir un compte et ses virements | son titulaire, ou un conseiller **de la même agence** |
| Créer un virement | le titulaire du compte débité |

1. Protégez la validation (`hasRole('CONSEILLER')` dans la chaîne, ou `@PreAuthorize` avec `@EnableMethodSecurity`). Alice doit obtenir un `403`.
2. Alice demande le compte de Charles (`/api/comptes/2`) : fermez cette faille. Il faut regarder **l'utilisateur courant** dans le service, pas seulement le rôle.
3. `GET /api/comptes` ne doit renvoyer que les comptes auxquels on a droit.
4. Côté Angular : une guard par rôle (`data: { roles: [...] }` sur la route), et le bouton « Valider » visible seulement pour un conseiller.
5. Dans le navigateur, retirez le bouton « à la main » et appelez l'API : qu'est-ce qui vous protège ? **Le front n'est qu'un confort d'affichage.**

## Bonus

- Un test `MockMvc` avec `@WithMockUser` pour chaque règle de la partie 3.
- Répondre `404` plutôt que `403` sur le compte d'un autre : pourquoi ?
- Pourquoi BCrypt plutôt que SHA-256 ? Quel est son coût à chaque requête en Basic Auth ?
- Que faudrait-il changer pour passer en JWT ou en session ?

## Reponses de TD

  1. Que renvoie maintenant l'API : toutes les requêtes reçoivent 401 Unauthorized.
     Spring Security active une chaîne de filtres qui exige une authentification sur toutes les URL (
     secure by default).

  2. Vérification : curl -u alice:alice123 localhost:8080/api/me >>>>  {"login":"alice","roles":["CLIENT"]}
   
  3. Vérification : curl -v -u alice:alice123 localhost:8080/api/me 2>&1 | grep Authorization080/api/me 2>&1 | grep Authorization
    >>>>>>>>>>>>> Authorization: Basic YWxpY2U6YWxpY2UxMjM=
   echo YWxpY2U6YWxpY2UxMjM= | base64 -d
   >>>>>>>>>>>>> alice:alice123(base)
   
   non ça ce n'est pas du chiffrement. Base64 est un encodage réversible par
   n'importe qui, sans clé. Le login et le mot de passe circulent donc en clair à chaque requête.
  
  4. Vérification CORS :

```bash
curl -i -XOPTIONS localhost:8080/api/comptes -H 'Origin: http://localhost:4200' -H 'Access-Control-Request-Method: GET' -H 'Access-Control-Request-Headers: authorization'
```

Résultat : 
HTTP/1.1 200 
Vary: Origin
Vary: Access-Control-Request-Method
Vary: Access-Control-Request-Headers
Access-Control-Allow-Origin: http://localhost:4200
Access-Control-Allow-Methods: GET,POST,PUT,DELETE
Access-Control-Allow-Headers: authorization
Access-Control-Max-Age: 1800
X-Content-Type-Options: nosniff
X-XSS-Protection: 0
Cache-Control: no-cache, no-store, max-age=0, must-revalidate
Pragma: no-cache
Expires: 0
X-Frame-Options: DENY
Content-Length: 0
Date: Fri, 20 Nov 2026 15:02:28 GMT

La configuration CORS fonctionne : le front Angular peut appeler l'API avec les méthodes GET, POST, PUT et DELETE et envoyer le token dans l'en-tête `Authorization`.

  5. le CSRF :
    On le désactive. Une attaque CSRF exploite le fait que le navigateur renvoie automatiquement un cookie de session. Ici, il n'y a pas de session : l'en-tête Authorization est ajouté par le code, jamais automatiquement par le navigateur. Sans cette désactivation, tous les POST renverraient 403.
  

  