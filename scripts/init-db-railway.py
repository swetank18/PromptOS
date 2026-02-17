import os
from pathlib import Path

import psycopg2


def main() -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")

    root = Path(__file__).resolve().parents[1]
    schema_path = root / "backend" / "db" / "schema.sql"
    sql = schema_path.read_text(encoding="utf-8")

    with psycopg2.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()

    print("Schema initialization completed.")


if __name__ == "__main__":
    main()
