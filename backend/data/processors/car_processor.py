import csv
from pathlib import Path
from typing import Dict, Optional
from pydantic import BaseModel


class CarInfo(BaseModel):
    """Car Information Model"""
    car_id: int
    name: str
    maker_id: int
    maker_name: str
    image_url: str


class CarDataProcessor:
    """Processor for manufacturer data."""

    def __init__(self):
        self._cars: Dict[int, CarInfo] = {}
        self._makers: Dict[int, str] = {}
        self._load_data()

    def _load_data(self):
        """Load car and manufacturer data from CSV files."""
        directory = Path(__file__).parent.parent / "data"

        # loading manufacturers
        with open(directory / "makers.csv", "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                self._makers[int(row["ID"])] = row["Name"]

        with open(directory / "cars.csv", "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                car_id = int(row["ID"])
                maker_id = int(row["Maker"])
                name = row["ShortName"]
                maker_name = self._makers.get(maker_id, "Unknown")

                # Generate image URL
                image_url = self._generate_image_url(maker_name, name)

                self._cars[car_id] = CarInfo(
                    id=car_id,
                    name=name,
                    maker_id=maker_id,
                    maker_name=maker_name,
                    image_url=image_url
                )

        def _generate_image_url(self, maker: str, model: str) -> str:
            """
                Generate image URL with proper formatting for GTPlus website.
                example: https://gtplus.app/gt7/cars/jaguar-vgt-sv
                format:  gtplus.app/gt7/cars/{manufacturer}-{model} (lowercase, hyphenated)
            """
            model_lower = model.lower()
            maker_lower = maker.lower()

            # handle special cases where model name includes manufacturer in cars.csv
            if model_lower.startswith(maker_lower):
                url_part = model_lower
            else:
                url_part = f"{maker_lower}-{model_lower}"

            # remove spaces and double hyphens
            url_part = url_part.replace(" ", "-").replace("--", "-")
            return f"https://gtplus.app/gt7/cars/{url_part}"

        def get_car_info(self, car_id: int) -> Optional[CarInfo]:
            """Get car information by car id."""
            return self._cars.get(car_id)


# Create singleton instance
car_processor = CarDataProcessor()
