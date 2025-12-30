"""
Pomodoro Statistics Handler - API endpoints for Pomodoro session statistics

Endpoints:
- POST /pomodoro/stats - Get Pomodoro statistics for a specific date
- POST /pomodoro/session-detail - Get detailed session data with activities
- DELETE /pomodoro/sessions/delete - Delete a session and cascade delete activities
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from core.db import get_db
from core.events import emit_pomodoro_session_deleted
from core.logger import get_logger
from models.base import BaseModel
from models.responses import (
    DeletePomodoroSessionData,
    DeletePomodoroSessionRequest,
    DeletePomodoroSessionResponse,
    FocusMetrics,
    GetPomodoroSessionDetailRequest,
    GetPomodoroSessionDetailResponse,
    PhaseTimelineItem,
    PomodoroActivityData,
    PomodoroSessionData,
    PomodoroSessionDetailData,
    TimedOperationResponse,
)

# CRITICAL: Use relative import to avoid circular imports
from . import api_handler

logger = get_logger(__name__)


# ============ Request Models ============


class GetPomodoroStatsRequest(BaseModel):
    """Request to get Pomodoro statistics for a specific date"""

    date: str  # YYYY-MM-DD format


# ============ Response Models ============


class PomodoroStatsData(BaseModel):
    """Pomodoro statistics for a specific date"""

    date: str
    completed_count: int
    total_focus_minutes: int
    average_duration_minutes: int
    sessions: List[Dict[str, Any]]  # Recent sessions for the day


class GetPomodoroStatsResponse(TimedOperationResponse):
    """Response with Pomodoro statistics"""

    data: Optional[PomodoroStatsData] = None


# ============ API Handlers ============


@api_handler(
    body=GetPomodoroStatsRequest,
    method="POST",
    path="/pomodoro/stats",
    tags=["pomodoro"],
)
async def get_pomodoro_stats(
    body: GetPomodoroStatsRequest,
) -> GetPomodoroStatsResponse:
    """
    Get Pomodoro statistics for a specific date

    Returns:
    - Number of completed sessions
    - Total focus time (minutes)
    - Average session duration (minutes)
    - List of all sessions for that day
    """
    try:
        db = get_db()

        # Validate date format
        try:
            datetime.fromisoformat(body.date)
        except ValueError:
            return GetPomodoroStatsResponse(
                success=False,
                message="Invalid date format. Expected YYYY-MM-DD",
                timestamp=datetime.now().isoformat(),
            )

        # Get daily stats from repository
        stats = await db.pomodoro_sessions.get_daily_stats(body.date)

        # Optionally fetch associated TODO titles for sessions
        sessions_with_todos = []
        for session in stats.get("sessions", []):
            session_data = dict(session)

            # If session has associated_todo_id, fetch TODO title
            if session_data.get("associated_todo_id"):
                try:
                    todo = await db.todos.get_by_id(session_data["associated_todo_id"])
                    if todo and not todo.get("deleted"):
                        session_data["associated_todo_title"] = todo.get("title")
                    else:
                        session_data["associated_todo_title"] = None
                except Exception as e:
                    logger.warning(
                        f"Failed to fetch TODO for session {session_data.get('id')}: {e}"
                    )
                    session_data["associated_todo_title"] = None

            # Calculate pure work duration (excludes breaks)
            completed_rounds = session_data.get("completed_rounds", 0)
            work_duration = session_data.get("work_duration_minutes", 25)
            session_data["pure_work_duration_minutes"] = completed_rounds * work_duration

            sessions_with_todos.append(session_data)

        logger.debug(
            f"Retrieved Pomodoro stats for {body.date}: "
            f"{stats['completed_count']} completed, "
            f"{stats['total_focus_minutes']} minutes"
        )

        return GetPomodoroStatsResponse(
            success=True,
            message=f"Retrieved statistics for {body.date}",
            data=PomodoroStatsData(
                date=body.date,
                completed_count=stats["completed_count"],
                total_focus_minutes=stats["total_focus_minutes"],
                average_duration_minutes=stats["average_duration_minutes"],
                sessions=sessions_with_todos,
            ),
            timestamp=datetime.now().isoformat(),
        )

    except Exception as e:
        logger.error(f"Failed to get Pomodoro stats: {e}", exc_info=True)
        return GetPomodoroStatsResponse(
            success=False,
            message=f"Failed to get statistics: {str(e)}",
            timestamp=datetime.now().isoformat(),
        )


@api_handler(
    body=GetPomodoroSessionDetailRequest,
    method="POST",
    path="/pomodoro/session-detail",
    tags=["pomodoro"],
)
async def get_pomodoro_session_detail(
    body: GetPomodoroSessionDetailRequest,
) -> GetPomodoroSessionDetailResponse:
    """
    Get detailed Pomodoro session with activities and focus metrics

    Returns:
    - Full session data
    - All activities generated during this session (ordered by work phase)
    - Calculated focus metrics (overall_focus_score, activity_count, topic_diversity, etc.)
    """
    try:
        db = get_db()

        # Get session
        session = await db.pomodoro_sessions.get_by_id(body.session_id)
        if not session:
            return GetPomodoroSessionDetailResponse(
                success=False,
                message=f"Session not found: {body.session_id}",
                timestamp=datetime.now().isoformat(),
            )

        # Get activities for this session
        activities = await db.activities.get_by_pomodoro_session(body.session_id)

        # Convert activities to Pydantic models
        activity_data_list = [
            PomodoroActivityData(
                id=activity["id"],
                title=activity["title"],
                description=activity["description"],
                start_time=activity["start_time"],
                end_time=activity["end_time"],
                session_duration_minutes=activity.get("session_duration_minutes") or 0,
                work_phase=activity.get("pomodoro_work_phase"),
                focus_score=activity.get("focus_score"),
                topic_tags=activity.get("topic_tags") or [],
                source_event_ids=activity.get("source_event_ids") or [],
                source_action_ids=activity.get("source_action_ids") or [],
                aggregation_mode=activity.get("aggregation_mode", "action_based"),
            )
            for activity in activities
        ]

        # Calculate focus metrics
        focus_metrics_dict = _calculate_session_focus_metrics(session, activities)
        focus_metrics = FocusMetrics(
            overall_focus_score=focus_metrics_dict["overall_focus_score"],
            activity_count=focus_metrics_dict["activity_count"],
            topic_diversity=focus_metrics_dict["topic_diversity"],
            average_activity_duration=focus_metrics_dict["average_activity_duration"],
            focus_level=focus_metrics_dict["focus_level"],
        )

        # Calculate pure work duration (excludes breaks)
        session_with_pure_duration = dict(session)
        completed_rounds = session_with_pure_duration.get("completed_rounds", 0)
        work_duration = session_with_pure_duration.get("work_duration_minutes", 25)
        session_with_pure_duration["pure_work_duration_minutes"] = completed_rounds * work_duration

        # Calculate phase timeline
        phase_timeline_raw = _calculate_phase_timeline(session)
        phase_timeline = [
            PhaseTimelineItem(
                phase_type=phase["phase_type"],
                phase_number=phase["phase_number"],
                start_time=phase["start_time"],
                end_time=phase["end_time"],
                duration_minutes=phase["duration_minutes"],
            )
            for phase in phase_timeline_raw
        ]

        logger.debug(
            f"Retrieved session detail for {body.session_id}: "
            f"{len(activities)} activities, "
            f"focus score: {focus_metrics.overall_focus_score:.2f}"
        )

        return GetPomodoroSessionDetailResponse(
            success=True,
            message="Session details retrieved",
            data=PomodoroSessionDetailData(
                session=session_with_pure_duration,
                activities=activity_data_list,
                focus_metrics=focus_metrics,
                phase_timeline=phase_timeline,
            ),
            timestamp=datetime.now().isoformat(),
        )

    except Exception as e:
        logger.error(
            f"Failed to get session detail for {body.session_id}: {e}",
            exc_info=True,
        )
        return GetPomodoroSessionDetailResponse(
            success=False,
            message=f"Failed to get session details: {str(e)}",
            timestamp=datetime.now().isoformat(),
        )


# ============ Helper Functions ============


def _calculate_session_focus_metrics(
    session: Dict[str, Any], activities: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Calculate session-level focus metrics

    Metrics:
    - overall_focus_score: Weighted average of activity focus scores (by duration)
    - activity_count: Number of activities in session
    - topic_diversity: Number of unique topics across all activities
    - average_activity_duration: Average duration per activity (minutes)
    - focus_level: Human-readable level (excellent/good/moderate/low)

    Args:
        session: Session dictionary
        activities: List of activity dictionaries

    Returns:
        Dictionary with calculated metrics
    """
    if not activities:
        return {
            "overall_focus_score": 0.0,
            "activity_count": 0,
            "topic_diversity": 0,
            "average_activity_duration": 0,
            "focus_level": "low",
        }

    # Calculate weighted average focus score (weighted by activity duration)
    total_duration = sum(
        activity.get("session_duration_minutes") or 0 for activity in activities
    )

    if total_duration > 0:
        weighted_score = sum(
            (activity.get("focus_score") or 0.5)
            * (activity.get("session_duration_minutes") or 0)
            for activity in activities
        ) / total_duration
    else:
        # If no duration info, use simple average
        weighted_score = sum(
            activity.get("focus_score") or 0.5 for activity in activities
        ) / len(activities)

    # Calculate topic diversity
    all_topics = set()
    for activity in activities:
        all_topics.update(activity.get("topic_tags") or [])

    # Calculate average activity duration
    average_duration = (
        total_duration / len(activities) if len(activities) > 0 else 0
    )

    # Map score to focus level
    focus_level = _get_focus_level(weighted_score)

    return {
        "overall_focus_score": round(weighted_score, 2),
        "activity_count": len(activities),
        "topic_diversity": len(all_topics),
        "average_activity_duration": round(average_duration, 1),
        "focus_level": focus_level,
    }


def _get_focus_level(score: float) -> str:
    """
    Map focus score to human-readable level

    Args:
        score: Focus score (0.0-1.0)

    Returns:
        Focus level: "excellent", "good", "moderate", or "low"
    """
    if score >= 0.8:
        return "excellent"
    elif score >= 0.6:
        return "good"
    elif score >= 0.4:
        return "moderate"
    else:
        return "low"


def _calculate_phase_timeline(session: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Reconstruct work/break phase timeline from session metadata

    Calculates the timeline of work and break phases based on the session's
    start time and duration configurations. Assumes phases completed on schedule.

    Args:
        session: Session dictionary with metadata

    Returns:
        List of phase dictionaries with start_time, end_time, phase_type, phase_number
    """
    from datetime import timedelta

    start_time = datetime.fromisoformat(session["start_time"])
    work_duration = session.get("work_duration_minutes", 25)
    break_duration = session.get("break_duration_minutes", 5)
    completed_rounds = session.get("completed_rounds", 0)
    total_rounds = session.get("total_rounds", 4)
    status = session.get("status", "active")

    timeline = []
    current_time = start_time

    for round_num in range(1, completed_rounds + 1):
        # Work phase
        work_end = current_time + timedelta(minutes=work_duration)
        timeline.append({
            "phase_type": "work",
            "phase_number": round_num,
            "start_time": current_time.isoformat(),
            "end_time": work_end.isoformat(),
            "duration_minutes": work_duration,
        })
        current_time = work_end

        # Break phase (skip after last round if session completed)
        if round_num < total_rounds or status != "completed":
            break_end = current_time + timedelta(minutes=break_duration)
            timeline.append({
                "phase_type": "break",
                "phase_number": round_num,
                "start_time": current_time.isoformat(),
                "end_time": break_end.isoformat(),
                "duration_minutes": break_duration,
            })
            current_time = break_end

    return timeline


@api_handler(
    body=DeletePomodoroSessionRequest,
    method="DELETE",
    path="/pomodoro/sessions/delete",
    tags=["pomodoro"],
)
async def delete_pomodoro_session(
    body: DeletePomodoroSessionRequest,
) -> DeletePomodoroSessionResponse:
    """
    Delete a Pomodoro session and cascade delete all linked activities

    This operation:
    1. Validates session exists and is not already deleted
    2. Soft deletes all activities linked to this session (cascade)
    3. Soft deletes the session itself
    4. Emits deletion event to notify frontend

    Args:
        body: Request containing session_id

    Returns:
        Response with deletion result and count of cascade-deleted activities
    """
    try:
        db = get_db()

        # Validate session exists and is not deleted
        session = await db.pomodoro_sessions.get_by_id(body.session_id)
        if not session:
            return DeletePomodoroSessionResponse(
                success=False,
                error="Session not found or already deleted",
                timestamp=datetime.now().isoformat(),
            )

        # CASCADE: Soft delete all activities linked to this session
        deleted_activities_count = await db.activities.delete_by_session_id(
            body.session_id
        )

        # Soft delete the session
        await db.pomodoro_sessions.soft_delete(body.session_id)

        # Emit deletion event to frontend
        emit_pomodoro_session_deleted(
            body.session_id, datetime.now().isoformat()
        )

        logger.info(
            f"Deleted Pomodoro session {body.session_id} "
            f"and cascade deleted {deleted_activities_count} activities"
        )

        return DeletePomodoroSessionResponse(
            success=True,
            message=f"Session deleted successfully. {deleted_activities_count} linked activities also removed.",
            data=DeletePomodoroSessionData(
                session_id=body.session_id,
                deleted_activities_count=deleted_activities_count,
            ),
            timestamp=datetime.now().isoformat(),
        )

    except Exception as e:
        logger.error(
            f"Failed to delete Pomodoro session {body.session_id}: {e}",
            exc_info=True,
        )
        return DeletePomodoroSessionResponse(
            success=False,
            error=f"Failed to delete session: {str(e)}",
            timestamp=datetime.now().isoformat(),
        )
