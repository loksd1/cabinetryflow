from sqlmodel import SQLModel, Session, create_engine

from app.core.config import settings

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))



def init_db(session: Session) -> None:
    from app import models  
    SQLModel.metadata.create_all(engine)

    _ = session
