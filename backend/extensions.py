from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_mail import Mail

# Create extensions
db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()
mail = Mail()

# Custom JWT token handling
@jwt.token_in_blocklist_loader
def check_if_token_is_revoked(jwt_header, jwt_payload):
    # We're not using a blocklist yet, so always return False
    return False

@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_payload):
    # Custom handling for our simple token format in development
    identity = jwt_payload["sub"]
    
    # If the identity is in our custom format (token:id:role), extract the ID
    if isinstance(identity, str) and identity.startswith("token:"):
        parts = identity.split(":")
        if len(parts) >= 2:
            # Return just the user ID
            return parts[1]
    
    # Default case - return identity as is
    return identity 