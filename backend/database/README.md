# MongoDB Atlas setup

The database layer currently defines the three schema collections but does not replace the existing in-memory session flow yet.

## 1. Create an Atlas cluster

1. Sign in to MongoDB Atlas and create a free cluster.
2. In **Database Access**, create a database user with a strong password.
3. In **Network Access**, add the IP address of the machine running the backend. Use `0.0.0.0/0` only temporarily for testing.
4. In the cluster, choose **Connect** > **Drivers**, select Python, and copy the connection string.

## 2. Configure the backend

From the `backend` directory:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and replace the URI placeholders with the Atlas connection string. URL-encode special characters in the database username or password. Never commit `.env` or place credentials in source files.

Install the driver from the repository root:

```powershell
pip install -r backend/requirements.txt
```

## 3. Check the connection

Run this from the `backend` directory after setting the environment variables:

```powershell
python -c "from database.connection import ping_mongodb; print('MongoDB Atlas:', ping_mongodb())"
```

The models are available as:

```python
from database.models import AIPrediction, Metadata, SonarImage
```

Collections should use these names:

- `sonar_images`
- `metadata`
- `ai_predictions`
