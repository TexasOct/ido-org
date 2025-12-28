"""
Pomodoro Activity Linking Handler - API endpoints for linking unlinked activities

Provides endpoints to find and link unlinked activities to Pomodoro sessions
based on time overlap.
"""

from datetime import datetime
from typing import List

from core.db import get_db
from core.logger import get_logger
from models.base import BaseModel
from models.responses import TimedOperationResponse

# CRITICAL: Use relative import to avoid circular imports
from . import api_handler

logger = get_logger(__name__)


# ============ Request Models ============


class FindUnlinkedActivitiesRequest(BaseModel):
    """Request to find activities that could be linked to a session"""

    session_id: str


class LinkActivitiesRequest(BaseModel):
    """Request to link activities to a session"""

    session_id: str
    activity_ids: List[str]


# ============ Response Models ============


class UnlinkedActivityData(BaseModel):
    """Activity that could be linked to session"""

    id: str
    title: str
    start_time: str
    end_time: str
    session_duration_minutes: int


class FindUnlinkedActivitiesResponse(TimedOperationResponse):
    """Response with unlinked activities"""

    activities: List[UnlinkedActivityData] = []


class LinkActivitiesResponse(TimedOperationResponse):
    """Response after linking activities"""

    linked_count: int = 0


# ============ API Handlers ============


@api_handler(
    body=FindUnlinkedActivitiesRequest,
    method="POST",
    path="/pomodoro/find-unlinked-activities",
    tags=["pomodoro"],
)
async def find_unlinked_activities(
    body: FindUnlinkedActivitiesRequest,
) -> FindUnlinkedActivitiesResponse:
    """
    Find activities that overlap with session time but aren't linked

    Returns list of activities that could be retroactively linked
    """
    try:
        db = get_db()

        # Get session
        session = await db.pomodoro_sessions.get_by_id(body.session_id)
        if not session:
            return FindUnlinkedActivitiesResponse(
                success=False,
                message=f"Session not found: {body.session_id}",
                timestamp=datetime.now().isoformat(),
            )

        # Find overlapping activities
        overlapping = await db.activities.find_unlinked_overlapping_activities(
            session_start_time=session["start_time"],
            session_end_time=session.get("end_time", datetime.now().isoformat()),
        )

        # Convert to response format
        activity_data = [
            UnlinkedActivityData(
                id=a["id"],
                title=a["title"],
                start_time=a["start_time"],
                end_time=a["end_time"],
                session_duration_minutes=a.get("session_duration_minutes", 0),
            )
            for a in overlapping
        ]

        logger.debug(
            f"Found {len(activity_data)} unlinked activities for session {body.session_id}"
        )

        return FindUnlinkedActivitiesResponse(
            success=True,
            message=f"Found {len(activity_data)} unlinked activities",
            activities=activity_data,
            timestamp=datetime.now().isoformat(),
        )

    except Exception as e:
        logger.error(f"Failed to find unlinked activities: {e}", exc_info=True)
        return FindUnlinkedActivitiesResponse(
            success=False,
            message=str(e),
            timestamp=datetime.now().isoformat(),
        )


@api_handler(
    body=LinkActivitiesRequest,
    method="POST",
    path="/pomodoro/link-activities",
    tags=["pomodoro"],
)
async def link_activities_to_session(
    body: LinkActivitiesRequest,
) -> LinkActivitiesResponse:
    """
    Link selected activities to a Pomodoro session

    Updates activity records with pomodoro_session_id
    """
    try:
        db = get_db()

        # Verify session exists
        session = await db.pomodoro_sessions.get_by_id(body.session_id)
        if not session:
            return LinkActivitiesResponse(
                success=False,
                message=f"Session not found: {body.session_id}",
                timestamp=datetime.now().isoformat(),
            )

        # Link activities
        linked_count = await db.activities.link_activities_to_session(
            activity_ids=body.activity_ids,
            session_id=body.session_id,
            work_phase=None,  # Could be enhanced to detect work phase
        )

        logger.info(
            f"Linked {linked_count} activities to session {body.session_id}"
        )

        return LinkActivitiesResponse(
            success=True,
            message=f"Successfully linked {linked_count} activities",
            linked_count=linked_count,
            timestamp=datetime.now().isoformat(),
        )

    except Exception as e:
        logger.error(f"Failed to link activities: {e}", exc_info=True)
        return LinkActivitiesResponse(
            success=False,
            message=str(e),
            timestamp=datetime.now().isoformat(),
        )
