# app/routes/auth.py - FIXED VERSION
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database.database import get_db
from app.database.models import User, UserFHIRMapping
from app.schemas.schemas import (
    UserCreate,
    UserLogin,
    Token,
    UserResponse,
    TokenVerificationRequest,
)
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_user,
    verify_token_service,
)
from typing import Annotated

router = APIRouter(prefix="/auth", tags=["authentication"])

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[User, Depends(get_current_user)]


@router.get("/test")
def test_db_connection(db: db_dependency):
    try:
        user_count = db.query(User).count()
        return {
            "status": "success",
            "message": "Database connection is working",
            "user_count": user_count,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database connection failed: {str(e)}",
        )


@router.post("/register", response_model=Token)
def register(user_data: UserCreate, db: db_dependency):
    print(f"📝 Registration attempt for: {user_data.username}, {user_data.email}")

    try:
        existing_user = (
            db.query(User).filter(User.username == user_data.username).first()
        )
        if existing_user:
            print("❌ Username already exists")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken"
            )

        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            print("❌ Email already exists")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Email already existed"
            )

        print("✅ Creating new user...")
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed_password,
            age=user_data.age,
            sex=user_data.sex,
            role=user_data.role,
            zipcode=user_data.zipcode,
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        user = db.query(User).filter(User.username == user_data.username).first()

        new_mapping = UserFHIRMapping(user_id=user.id, fhir_patient_id="example")
        db.add(new_mapping)
        db.commit()
        db.refresh(new_mapping)

        print(f"✅ User created: {db_user.username}")

        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user_data.username, "role": user_data.role},
            expires_delta=access_token_expires,
        )
        return {"access_token": access_token, "token_type": "bearer"}

    except Exception as e:
        db.rollback()
        print(f"❌ Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed",
        )


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    print(f"🔐 Login attempt - identifier: '{form_data.username}'")
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires,
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: user_dependency):
    return current_user


@router.post("/verify")
async def verify_token(token: TokenVerificationRequest, db: db_dependency):
    if not token.token:
        return {"success": True, "valid": False, "user": None, "message": "No token"}
    payload = verify_token_service(token.token)
    if not payload:
        return {
            "success": True,
            "valid": False,
            "user": None,
            "message": "invalid token",
        }
    username = payload.get("sub")
    user = payload.get("user_id")

    if not username:
        return {
            "success": True,
            "valid": False,
            "user": None,
            "message": "invalid token payload",
        }

    user = db.query(User).filter(User.username == username).first()
    if not user:
        return {
            "success": True,
            "valid": False,
            "user": None,
            "message": "User not found",
        }
    return {
        "success": True,
        "valid": True,
        "user": {
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
        },
        "message": "Token is valid",
    }
