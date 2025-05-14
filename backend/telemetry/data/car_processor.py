import csv
import urllib.request
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
        with open(directory / "maker.csv", "r", encoding="utf-8") as f:
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
                    car_id=car_id,
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
        if maker_lower in model_lower:
            url_part = model_lower
        else:
            url_part = f"{maker_lower}-{model_lower}"

        # remove spaces and double hyphens
        url_part = url_part.replace(" ", "-").replace("'","").replace('"', "").replace("--", "-")
        return f"https://gtplus.app/_next/image?url=%2Fimages%2Fcars%2F{url_part}.jpg&w=1920&q=75"
    
    def _download_files(self):
        cars_url = 'https://raw.githubusercontent.com/ddm999/gt7info/web-new/_data/db/cars.csv'
        cars_filename = 'telemetry/data/cars.csv'
        urllib.request.urlretrieve(cars_url, cars_filename)

        maker_url = 'https://raw.githubusercontent.com/ddm999/gt7info/web-new/_data/db/maker.csv'
        maker_filename = 'telemetry/data/maker.csv'
        urllib.request.urlretrieve(maker_url, maker_filename)

    def get_car_info(self, car_id: int) -> Optional[CarInfo]:
        """Get car information by car id."""
        # for when the cars.csv list is outdated after a new update
        if car_id not in self._cars:
            self._download_files() # download updated files
            self._load_data() # reload data

        return self._cars.get(car_id)


# Create singleton instance
car_processor = CarDataProcessor()
