# Déploiement Minikube

L'API et PostgreSQL utilisent le Secret `postgres-credentials`. Le fichier
`k8s/postgres-secret.yaml` est un fichier généré localement et n'est pas
versionné. Il ne faut pas y écrire les valeurs manuellement.

Depuis la racine du projet, générez-le à partir de votre fichier `.env` :

```bash
kubectl create secret generic postgres-credentials \
  --from-env-file=.env \
  --dry-run=client -o yaml > k8s/postgres-secret.yaml
```

Pour éviter le fichier intermédiaire avec :
```bash
kubectl create secret generic postgres-credentials \
  --from-env-file=.env \
  --dry-run=client -o yaml | kubectl apply -f -
```

Vérifiez uniquement que le Secret existe, sans afficher son contenu :

```bash
kubectl get secret postgres-credentials
```

Déployez ensuite la stack :

```bash
kubectl apply -f k8s/
kubectl rollout status deployment/postgres
kubectl rollout status deployment/api
kubectl rollout status deployment/nginx
kubectl rollout status deployment/pgadmin
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
