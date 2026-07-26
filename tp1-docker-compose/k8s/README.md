# Déploiement Minikube

L'API utilise le Secret `postgres-credentials`. Créez-le à partir de votre
fichier `.env` local (ce fichier n'est pas versionné) :

```bash
kubectl create secret generic postgres-credentials \
  --from-env-file=.env \
  --dry-run=client -o yaml | kubectl apply -f -
```

Déployez ensuite la stack :

```bash
kubectl apply -f k8s/
kubectl rollout status deployment/postgres
kubectl rollout status deployment/api-deployment
kubectl rollout status deployment/nginx
```

Accédez à l'application par Nginx :

```bash
minikube service nginx --url
```

Ajoutez `/api/health`, `/api/users` ou `/api-docs` à l'URL renvoyée. Pour
pgAdmin, utilisez `minikube service pgadmin --url` puis connectez-vous avec
`admin@admin.com` / `admin`. Dans pgAdmin, le nom d'hôte de PostgreSQL est
`postgres`, le port `5432`, et les identifiants sont ceux du fichier `.env`.

Les scripts d'initialisation PostgreSQL ne sont exécutés que lors de la
création du volume. Pour repartir de zéro, supprimez explicitement le PVC
`postgres-data` (cela efface les données), puis recréez la stack.
