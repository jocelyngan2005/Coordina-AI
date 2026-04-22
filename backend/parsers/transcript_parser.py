"""
parsers/transcript_parser.py

Cleans and structures meeting transcript text for GLM ingestion.
"""

import re


class TranscriptParser:
    """
    Normalises meeting transcripts.
    Strips timestamps, identifies speakers, and segments the text
    into speaker turns for structured GLM context.
    """

    # Matches "00:12:34 Speaker Name:" or "[00:12] Name:"
    TIMESTAMP_PATTERN = re.compile(r"[\[\(]?\d{1,2}:\d{2}(?::\d{2})?[\]\)]?\s*")
    SPEAKER_PATTERN = re.compile(r"^([A-Z][a-zA-Z\s]+):\s*")

    def parse(self, raw_text: str) -> dict:
        """
        Returns:
        {
            "turns": [{"speaker": str, "text": str}],
            "speakers": [str],
            "cleaned_text": str,
        }
        """
        turns = []
        current_speaker = "Unknown"
        current_lines = []

        for line in raw_text.splitlines():
            # Strip timestamps
            line = self.TIMESTAMP_PATTERN.sub("", line).strip()
            if not line:
                continue

            speaker_match = self.SPEAKER_PATTERN.match(line)
            if speaker_match:
                if current_lines:
                    turns.append({"speaker": current_speaker, "text": " ".join(current_lines)})
                current_speaker = speaker_match.group(1).strip()
                current_lines = [line[speaker_match.end():].strip()]
            else:
                current_lines.append(line)

        if current_lines:
            turns.append({"speaker": current_speaker, "text": " ".join(current_lines)})

        speakers = list(dict.fromkeys(t["speaker"] for t in turns))
        cleaned = "\n".join(f"{t['speaker']}: {t['text']}" for t in turns)

        return {"turns": turns, "speakers": speakers, "cleaned_text": cleaned}


transcript_parser = TranscriptParser()


# ----------------------------------------------------------------------- #

"""
parsers/chat_log_parser.py

Parses exported chat logs (plain text format) into structured turn sequences.
"""


class ChatLogParser:
    """
    Handles common chat export formats:
    - "HH:MM - Name: message"
    - "[DD/MM/YYYY, HH:MM:SS] Name: message"
    """

    WHATSAPP_PATTERN = re.compile(
        r"\[?\d{1,2}/\d{1,2}/\d{2,4},?\s*\d{1,2}:\d{2}(?::\d{2})?\]?\s*-?\s*([^:]+):\s*(.*)"
    )
    SIMPLE_PATTERN = re.compile(r"\d{1,2}:\d{2}\s*-\s*([^:]+):\s*(.*)")

    def parse(self, raw_text: str) -> dict:
        turns = []
        for line in raw_text.splitlines():
            for pattern in (self.WHATSAPP_PATTERN, self.SIMPLE_PATTERN):
                match = pattern.match(line.strip())
                if match:
                    turns.append({
                        "speaker": match.group(1).strip(),
                        "text": match.group(2).strip(),
                    })
                    break

        speakers = list(dict.fromkeys(t["speaker"] for t in turns))
        cleaned = "\n".join(f"{t['speaker']}: {t['text']}" for t in turns)
        return {"turns": turns, "speakers": speakers, "cleaned_text": cleaned}


chat_log_parser = ChatLogParser()