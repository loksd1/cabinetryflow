import logging

from sqlmodel import Session, select

from app.core.db import engine, init_db
from app.models import Designation, Employee, Language

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init() -> None:
    with Session(engine) as session:
        init_db(session)

        admin_username = "admin"
        admin_password = "Test12345+"

        existing_admin = session.exec(
            select(Employee).where(Employee.username == admin_username)
        ).first()

        if not existing_admin:
            admin = Employee(
                name="Admin",
                username=admin_username,
                password=admin_password,
                designation=Designation.ADMIN,
                language=Language.EN,
            )
            session.add(admin)
            session.commit()
            logger.info("Default admin user created: %s", admin_username)
        else:
            logger.info("Default admin user already exists: %s", admin_username)


def main() -> None:
    logger.info("Creating initial data")
    init()
    logger.info("Initial data created")


if __name__ == "__main__":
    main()
