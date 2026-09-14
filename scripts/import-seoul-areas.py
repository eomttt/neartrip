"""서울시 공식 WGS84 SHP 파일을 서버 조회용 JSON으로 변환합니다. pyshp 필요."""
import json
import sys
from pathlib import Path
import shapefile

source = shapefile.Reader(sys.argv[1], encoding="utf-8")
areas = []
for feature in source.shapeRecords():
    record = feature.record.as_dict()
    geometry = feature.shape.__geo_interface__
    assert geometry["type"] in ("Polygon", "MultiPolygon")
    polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    areas.append({"code": record["AREA_CD"], "name": record["AREA_NM"], "bbox": list(feature.shape.bbox), "polygons": polygons})
assert len(areas) == 121 and len({area["code"] for area in areas}) == 121
Path(sys.argv[2]).write_text(json.dumps(areas, ensure_ascii=False, separators=(",", ":")) + "\n")
