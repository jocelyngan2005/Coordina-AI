"""
parsers/chat_logs_parser.py

Cleans and structures chat log text (Slack, Discord, Teams, etc.) for GLM ingestion.
"""

import re
from datetime import datetime


class ChatLogsParser:
    """
    Normalises chat logs from various platforms.
    Supports formats like:
    - [HH:MM] User: message
    - User (HH:MM): message
    - User: message
    - @User: message
    
    Returns structured turns with speaker and message content.
    """

    # Matches timestamps in various formats: [12:34], (12:34), 12:34, etc.
    TIMESTAMP_PATTERN = re.compile(r"[\[\(]?\d{1,2}:\d{2}(?::\d{2})?[\]\)]?\s*")
    
    # Matches speaker patterns: "User:", "@User:", "User (timestamp):"
    SPEAKER_PATTERN = re.compile(r"^[@]?([a-zA-Z0-9\-_.]+)\s*(?:\([^)]*\))?\s*:\s*")

    def parse(self, raw_text: str) -> dict:
        """
        Parse chat logs and return structured turns.
        
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
            line = line.strip()
            if not line:
                continue

            # Remove leading timestamps
            line = self.TIMESTAMP_PATTERN.sub("", line).strip()
            
            # Try to match speaker pattern
            speaker_match = self.SPEAKER_PATTERN.match(line)
            if speaker_match:
                # Save previous speaker's turn
                if current_lines:
                    turns.append({
                        "speaker": current_speaker,
                        "text": " ".join(current_lines)
                    })
                
                current_speaker = speaker_match.group(1).strip()
                # Get message after the speaker: part
                remaining = line[speaker_match.end():].strip()
                current_lines = [remaining] if remaining else []
            else:
                # Continuation of previous speaker's message
                current_lines.append(line)

        # Save last speaker's turn
        if current_lines:
            turns.append({
                "speaker": current_speaker,
                "text": " ".join(current_lines)
            })

        # Extract unique speakers
        speakers = list(dict.fromkeys(t["speaker"] for t in turns))
        
        # Build cleaned text
        cleaned = "\n".join(f"{t['speaker']}: {t['text']}" for t in turns)

        return {
            "turns": turns,
            "speakers": speakers,
            "cleaned_text": cleaned,
            "message_count": len(turns),
        }


chat_logs_parser = ChatLogsParser()
