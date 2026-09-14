# 서울 혼잡도 구역 경계

`seoul-crowding-areas.json`은 서울시의 「서울시 주요 121장소 영역.zip」 SHP를 변환한 파일입니다. 원본 좌표와 다각형 내부 구멍을 보존하며 단순화하거나 반경으로 대체하지 않습니다.

- 제공: 서울특별시, 공공누리 제1유형
- 출처: https://data.seoul.go.kr/dataList/OA-21778/A/1/datasetView.do
- 원본 수정일: 2026-04-14
- 다운로드·변환일: 2026-09-11
- 좌표계: WGS84 경도·위도

경계가 갱신되면 위 공식 페이지의 영역 파일을 내려받고 `pyshp`를 설치한 Python으로 `scripts/import-seoul-areas.py 원본.shp server/data/seoul-crowding-areas.json`을 실행합니다. 장소 수가 달라졌다면 변환 스크립트와 테스트의 검증 기준도 확인합니다.
