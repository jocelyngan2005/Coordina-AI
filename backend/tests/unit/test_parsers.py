"""
tests/unit/test_parsers.py

Unit tests for all parser modules:
  - DocumentParser  (PDF, DOCX, TXT)
  - RubricParser
  - TranscriptParser
  - ChatLogParser
"""

import pytest
from unittest.mock import MagicMock, patch

from parsers.document_parser import DocumentParser
from parsers.rubric_parser import RubricParser
from parsers.transcript_parser import TranscriptParser, ChatLogParser


# ================================================================== #
#  DocumentParser                                                      #
# ================================================================== #

class TestDocumentParser:

    def test_plain_text_decoded_correctly(self):
        parser = DocumentParser()
        content = b"Hello world. This is a test brief."
        result = parser.extract(content, "text/plain")
        assert result == "Hello world. This is a test brief."

    def test_markdown_decoded_as_plain_text(self):
        parser = DocumentParser()
        content = b"# Heading\n\nParagraph text here."
        result = parser.extract(content, "text/markdown")
        assert "Heading" in result
        assert "Paragraph" in result

    def test_unknown_mime_type_returns_raw_decode(self):
        parser = DocumentParser()
        content = b"Raw content"
        result = parser.extract(content, "application/octet-stream")
        assert result == "Raw content"

    def test_utf8_with_non_ascii_characters(self):
        parser = DocumentParser()
        content = "Héllo Wörld — projet académique.".encode("utf-8")
        result = parser.extract(content, "text/plain")
        assert "Héllo" in result
        assert "académique" in result

    def test_pdf_extraction_called_for_pdf_mime(self):
        parser = DocumentParser()
        with patch.object(parser, "_extract_pdf", return_value="PDF content") as mock_pdf:
            result = parser.extract(b"fake pdf bytes", "application/pdf")
        mock_pdf.assert_called_once()
        assert result == "PDF content"

    def test_docx_extraction_called_for_docx_mime(self):
        parser = DocumentParser()
        docx_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        with patch.object(parser, "_extract_docx", return_value="DOCX content") as mock_docx:
            result = parser.extract(b"fake docx bytes", docx_mime)
        mock_docx.assert_called_once()
        assert result == "DOCX content"

    def test_pdf_extraction_returns_empty_on_failure(self):
        parser = DocumentParser()
        # Pass clearly invalid bytes — PyPDF2 should fail gracefully
        result = parser._extract_pdf(b"not a real pdf")
        assert result == ""

    def test_docx_extraction_returns_empty_on_failure(self):
        parser = DocumentParser()
        result = parser._extract_docx(b"not a real docx")
        assert result == ""

    def test_pdf_extraction_joins_pages_with_double_newline(self):
        parser = DocumentParser()

        mock_page1 = MagicMock()
        mock_page1.extract_text.return_value = "Page one content"
        mock_page2 = MagicMock()
        mock_page2.extract_text.return_value = "Page two content"

        mock_reader = MagicMock()
        mock_reader.pages = [mock_page1, mock_page2]

        with patch("PyPDF2.PdfReader", return_value=mock_reader):
            result = parser._extract_pdf(b"fake pdf")

        assert "Page one content" in result
        assert "Page two content" in result
        assert "\n\n" in result

    def test_pdf_skips_none_pages(self):
        """Pages that return None from extract_text should be skipped."""
        parser = DocumentParser()

        mock_page1 = MagicMock()
        mock_page1.extract_text.return_value = "Valid content"
        mock_page2 = MagicMock()
        mock_page2.extract_text.return_value = None

        mock_reader = MagicMock()
        mock_reader.pages = [mock_page1, mock_page2]

        with patch("PyPDF2.PdfReader", return_value=mock_reader):
            result = parser._extract_pdf(b"fake pdf")

        assert "Valid content" in result
        # Should not raise or include "None"
        assert "None" not in result

    def test_docx_extraction_joins_paragraphs(self):
        parser = DocumentParser()

        mock_p1 = MagicMock()
        mock_p1.text = "First paragraph."
        mock_p2 = MagicMock()
        mock_p2.text = ""   # empty — should be skipped
        mock_p3 = MagicMock()
        mock_p3.text = "Third paragraph."

        mock_doc = MagicMock()
        mock_doc.paragraphs = [mock_p1, mock_p2, mock_p3]

        with patch("docx.Document", return_value=mock_doc):
            result = parser._extract_docx(b"fake docx")

        assert "First paragraph." in result
        assert "Third paragraph." in result
        # Empty paragraph should not produce extra separators
        assert "\n\n\n" not in result


# ================================================================== #
#  RubricParser                                                        #
# ================================================================== #

class TestRubricParser:

    def test_extracts_percentage_weights(self):
        parser = RubricParser()
        text = "System Architecture\n30%\nCode Quality\n25%"
        criteria = parser.parse(text)
        weights = [c["weight_value"] for c in criteria]
        assert 30 in weights
        assert 25 in weights

    def test_extracts_marks_format(self):
        parser = RubricParser()
        text = "Presentation\n20 marks"
        criteria = parser.parse(text)
        assert any(c["weight_value"] == 20 for c in criteria)

    def test_extracts_points_format(self):
        parser = RubricParser()
        text = "Report quality\n15 points"
        criteria = parser.parse(text)
        assert any(c["weight_value"] == 15 for c in criteria)

    def test_extracts_pts_abbreviation(self):
        parser = RubricParser()
        text = "Demo\n10 pts"
        criteria = parser.parse(text)
        assert any(c["weight_value"] == 10 for c in criteria)

    def test_criterion_title_from_previous_line(self):
        parser = RubricParser()
        text = "System Architecture\n30%"
        criteria = parser.parse(text)
        assert criteria[0]["criterion"] == "System Architecture"

    def test_description_field_contains_matched_line(self):
        parser = RubricParser()
        text = "Code Quality\nClean and modular code worth 25%"
        criteria = parser.parse(text)
        assert "25%" in criteria[0]["description"]

    def test_empty_text_returns_empty_list(self):
        parser = RubricParser()
        assert parser.parse("") == []

    def test_no_weights_returns_empty_list(self):
        parser = RubricParser()
        text = "Just plain text with no numbers or weights."
        assert parser.parse(text) == []

    def test_multiple_criteria_extracted(self):
        parser = RubricParser()
        text = """
Product Vision
10%
System Architecture
25%
Code Quality
30%
UI/UX
20%
Presentation
15%
        """
        criteria = parser.parse(text)
        assert len(criteria) == 5

    def test_weight_raw_field_preserved(self):
        parser = RubricParser()
        text = "Architecture\n30%"
        criteria = parser.parse(text)
        assert criteria[0]["weight_raw"] == "30%"

    def test_case_insensitive_unit_matching(self):
        parser = RubricParser()
        text = "Design\n20 MARKS"
        criteria = parser.parse(text)
        assert any(c["weight_value"] == 20 for c in criteria)


# ================================================================== #
#  TranscriptParser                                                    #
# ================================================================== #

class TestTranscriptParser:

    SAMPLE = """
00:01:00 Alice: Let's start the project planning meeting.
00:01:15 Bob: Sure, I think we should focus on the backend first.
00:01:30 Carol: Agreed. What about the GLM integration timeline?
00:02:00 Alice: I'd say two weeks is realistic.
00:02:10 Bob: That's tight but doable.
    """

    def test_identifies_all_speakers(self):
        parser = TranscriptParser()
        result = parser.parse(self.SAMPLE)
        assert "Alice" in result["speakers"]
        assert "Bob" in result["speakers"]
        assert "Carol" in result["speakers"]

    def test_correct_number_of_turns(self):
        parser = TranscriptParser()
        result = parser.parse(self.SAMPLE)
        assert len(result["turns"]) >= 5

    def test_timestamps_stripped_from_cleaned_text(self):
        parser = TranscriptParser()
        result = parser.parse(self.SAMPLE)
        assert "00:01:00" not in result["cleaned_text"]
        assert "00:02:10" not in result["cleaned_text"]

    def test_speaker_names_in_cleaned_text(self):
        parser = TranscriptParser()
        result = parser.parse(self.SAMPLE)
        assert "Alice:" in result["cleaned_text"]
        assert "Bob:" in result["cleaned_text"]

    def test_turn_content_not_empty(self):
        parser = TranscriptParser()
        result = parser.parse(self.SAMPLE)
        for turn in result["turns"]:
            assert turn["text"].strip() != ""

    def test_speaker_list_preserves_order_of_first_appearance(self):
        parser = TranscriptParser()
        result = parser.parse(self.SAMPLE)
        # Alice speaks first, then Bob, then Carol
        assert result["speakers"].index("Alice") < result["speakers"].index("Bob")
        assert result["speakers"].index("Bob") < result["speakers"].index("Carol")

    def test_empty_input_returns_empty_structures(self):
        parser = TranscriptParser()
        result = parser.parse("")
        assert result["turns"] == []
        assert result["speakers"] == []
        assert result["cleaned_text"] == ""

    def test_input_without_timestamps(self):
        parser = TranscriptParser()
        text = "Alice: Hello.\nBob: Hi there.\nAlice: Let's start."
        result = parser.parse(text)
        assert "Alice" in result["speakers"]
        assert "Bob" in result["speakers"]

    def test_consecutive_lines_by_same_speaker_merged(self):
        """Multiple consecutive lines from same speaker should be one turn."""
        parser = TranscriptParser()
        text = "Alice: First line.\nThis continues the thought.\nBob: My turn."
        result = parser.parse(text)
        alice_turns = [t for t in result["turns"] if t["speaker"] == "Alice"]
        assert len(alice_turns) == 1
        assert "First line" in alice_turns[0]["text"]


# ================================================================== #
#  ChatLogParser                                                       #
# ================================================================== #

class TestChatLogParser:

    WHATSAPP_LOG = """
[01/11/2025, 10:00:00] Alice: Hey everyone, meeting in 5?
[01/11/2025, 10:01:00] Bob: Sure, joining now
[01/11/2025, 10:01:30] Carol: On my way
[01/11/2025, 10:05:00] Alice: Let's discuss the GLM agent setup
[01/11/2025, 10:06:00] Bob: I think we should start with the planning agent
    """

    SIMPLE_LOG = """
10:00 - Alice: Starting the session
10:01 - Bob: Got it
10:02 - Alice: Let's review tasks
    """

    def test_whatsapp_format_parses_correctly(self):
        parser = ChatLogParser()
        result = parser.parse(self.WHATSAPP_LOG)
        assert len(result["turns"]) == 5

    def test_whatsapp_format_extracts_speakers(self):
        parser = ChatLogParser()
        result = parser.parse(self.WHATSAPP_LOG)
        assert "Alice" in result["speakers"]
        assert "Bob" in result["speakers"]
        assert "Carol" in result["speakers"]

    def test_whatsapp_format_speaker_order(self):
        parser = ChatLogParser()
        result = parser.parse(self.WHATSAPP_LOG)
        assert result["speakers"][0] == "Alice"

    def test_simple_format_parses_correctly(self):
        parser = ChatLogParser()
        result = parser.parse(self.SIMPLE_LOG)
        assert len(result["turns"]) == 3

    def test_simple_format_extracts_speakers(self):
        parser = ChatLogParser()
        result = parser.parse(self.SIMPLE_LOG)
        assert "Alice" in result["speakers"]
        assert "Bob" in result["speakers"]

    def test_message_content_preserved(self):
        parser = ChatLogParser()
        result = parser.parse(self.WHATSAPP_LOG)
        texts = [t["text"] for t in result["turns"]]
        assert any("GLM agent" in t for t in texts)

    def test_cleaned_text_contains_all_messages(self):
        parser = ChatLogParser()
        result = parser.parse(self.WHATSAPP_LOG)
        assert "GLM agent setup" in result["cleaned_text"]
        assert "planning agent" in result["cleaned_text"]

    def test_empty_log_returns_empty_structures(self):
        parser = ChatLogParser()
        result = parser.parse("")
        assert result["turns"] == []
        assert result["speakers"] == []

    def test_unrecognised_lines_skipped(self):
        """Lines that don't match any pattern should be silently ignored."""
        parser = ChatLogParser()
        text = "This is not a chat message\nNeither is this"
        result = parser.parse(text)
        assert result["turns"] == []

    def test_duplicate_speakers_not_duplicated_in_speakers_list(self):
        parser = ChatLogParser()
        result = parser.parse(self.WHATSAPP_LOG)
        # Alice appears 2x but should only appear once in speakers list
        assert result["speakers"].count("Alice") == 1
