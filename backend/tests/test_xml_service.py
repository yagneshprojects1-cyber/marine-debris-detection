from pathlib import Path

from services.xml_service import parse_annotation


def test_parse_annotation_allows_no_object_section(tmp_path):
    xml = tmp_path / "sample.xml"
    xml.write_text(
        """<?xml version='1.0' encoding='utf-8'?>
<annotation>
    <sonar>
        <range>9.50131</range>
        <azimuth>120</azimuth>
        <elevation>12</elevation>
        <soundspeed>1468.6</soundspeed>
        <frequency>1200k</frequency>
    </sonar>
    <file>
        <folder>UATD_Test_1</folder>
        <filename>00001</filename>
    </file>
    <size>
        <width>1024</width>
        <height>1950</height>
        <channel>3</channel>
    </size>
</annotation>
"""
    )

    data = parse_annotation(xml)

    assert data["sonar"]["range"] == 9.50131
    assert data["filename"] == "00001"
    assert data["objects"] == []
