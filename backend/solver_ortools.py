from ortools.sat.python import cp_model
from typing import List, Dict, Any

def generate_timetable(
    days: int, 
    periods: int, 
    rooms: List[dict], 
    mappings: List[dict], 
    subjects_info: dict,
    max_consec: int
):
    """
    mappings is expected to be a list of dictionaries:
    {
        "m_id": int,
        "section_id": int,
        "subject_id": int,
        "teacher_ids": List[int] (primary + optional secondary)
    }
    subjects_info: dict from subject_id to {"hours": int, "type": str, "name": str}
    
    Lab rules:
    - If a lab has hours >= 2, ALL its hours must be scheduled consecutively in the SAME day and room.
    - Prefer a dedicated lab room if one exists, otherwise fall back to a classroom.
    """
    model = cp_model.CpModel()

    num_days = range(days)
    num_periods = range(periods)
    num_rooms = range(len(rooms))

    # ── Basic assignment variables ──────────────────────────────────────────────
    # assignments[(m_id, d, p, r_index)] = 1 iff mapping m is in day d, period p, room r
    assignments = {}
    for m in mappings:
        for d in num_days:
            for p in num_periods:
                for r in num_rooms:
                    assignments[(m["m_id"], d, p, r)] = model.NewBoolVar(
                        f'assign_{m["m_id"]}_{d}_{p}_{r}'
                    )

    # ── HARD CONSTRAINTS ────────────────────────────────────────────────────────

    # 1. Total hours for each mapping == required hours
    for m in mappings:
        sub_info = subjects_info[m["subject_id"]]
        model.Add(
            sum(assignments[(m["m_id"], d, p, r)]
                for d in num_days
                for p in num_periods
                for r in num_rooms) == sub_info["hours"]
        )

    # 2. No room double-booked in any slot
    for d in num_days:
        for p in num_periods:
            for r in num_rooms:
                model.Add(
                    sum(assignments[(m["m_id"], d, p, r)] for m in mappings) <= 1
                )

    # 3. No teacher double-booked in any slot
    teacher_mappings: Dict[int, List[int]] = {}
    for m in mappings:
        for t_id in m["teacher_ids"]:
            teacher_mappings.setdefault(t_id, []).append(m["m_id"])

    for d in num_days:
        for p in num_periods:
            for t_id, m_ids in teacher_mappings.items():
                model.Add(
                    sum(assignments[(m_id, d, p, r)]
                        for m_id in m_ids
                        for r in num_rooms) <= 1
                )

    # 4. Teacher Workload: 18-20 hours per week
    for t_id, m_ids in teacher_mappings.items():
        total_hours_for_teacher = sum(
            assignments[(m_id, d, p, r)]
            for m_id in m_ids
            for d in num_days
            for p in num_periods
            for r in num_rooms
        )
        model.Add(total_hours_for_teacher >= 18)
        model.Add(total_hours_for_teacher <= 20)

    # 4. No section double-booked in any slot
    section_mappings: Dict[int, List[int]] = {}
    for m in mappings:
        section_mappings.setdefault(m["section_id"], []).append(m["m_id"])

    for d in num_days:
        for p in num_periods:
            for s_id, m_ids in section_mappings.items():
                model.Add(
                    sum(assignments[(m_id, d, p, r)]
                        for m_id in m_ids
                        for r in num_rooms) <= 1
                )

    # 5. Lab-room preference: if any lab room exists, restrict lab subjects to them
    has_lab_room = any(r["room_type"].lower() in ["lab", "practical"] for r in rooms)
    if has_lab_room:
        for m in mappings:
            sub_info = subjects_info[m["subject_id"]]
            if sub_info["type"].lower() in ["lab", "practical", "p"]:
                for d in num_days:
                    for p in num_periods:
                        for r_idx, r in enumerate(rooms):
                            if r["room_type"].lower() not in ["lab", "practical"]:
                                model.Add(assignments[(m["m_id"], d, p, r_idx)] == 0)

    # 6. CONSECUTIVE LAB CONSTRAINT ─────────────────────────────────────────────
    # For every lab mapping whose required hours H >= 2:
    #   All H periods must happen back-to-back on the SAME day in the SAME room.
    #
    # Strategy:
    #   Introduce a boolean "start[(m_id, d, p_start, r)]" which says:
    #     "this lab block begins at period p_start, day d, room r"
    #   Exactly one start must be chosen, and then periods p_start … p_start+H-1
    #   must all be set to 1 in that same (d, r).
    for m in mappings:
        sub_info = subjects_info[m["subject_id"]]
        is_lab = sub_info["type"].lower() in ["lab", "practical", "p"]
        h = sub_info["hours"]

        if not (is_lab and h >= 2):
            continue   # Theory or single-hour subjects use normal allocation

        # Start-anchor variables: one per (day, start_period, room) where the block fits
        start_vars = []
        for d in num_days:
            for p_start in range(periods - h + 1):          # must fit within day
                for r in num_rooms:
                    sv = model.NewBoolVar(f'start_{m["m_id"]}_{d}_{p_start}_{r}')
                    start_vars.append(sv)

                    # If this start is chosen → every period in the block is ON for (d, r)
                    for offset in range(h):
                        p = p_start + offset
                        model.Add(assignments[(m["m_id"], d, p, r)] == 1).OnlyEnforceIf(sv)

                    # If this start is NOT chosen → none of those slots is forced ON
                    # (the "total hours == H" constraint + exactly-one-start handles the rest)

        # Exactly one start must be active
        model.Add(sum(start_vars) == 1)

        # No period for this mapping may be assigned UNLESS it belongs to the chosen block.
        # Equivalently: for each assignment cell, there must exist a start_var that covers it.
        for d in num_days:
            for p in num_periods:
                for r in num_rooms:
                    covering_starts = []
                    for p_start in range(max(0, p - h + 1), min(p + 1, periods - h + 1)):
                        if p_start + h - 1 < periods:
                            # Find the corresponding start_var index — rebuild it
                            sv_name = f'start_{m["m_id"]}_{d}_{p_start}_{r}'
                            # We need the actual variable; rebuild the lookup
                            covering_starts.append(
                                model.NewBoolVar(f'cov_{m["m_id"]}_{d}_{p}_{r}_{p_start}')
                            )
                            # Link: cov => that particular start
                            # We use the direct approach: assignment can be 1 only if
                            # sum(start_var for covers p) >= 1.
                            # Since exact-one-start is enforced globally, a simpler
                            # approach is to forbid any (d, p, r) not in the window:
                    # Simpler: assignment(d,p,r)==1 requires some start covers it.
                    # Because exactly-one-start + block-assignment already enforces
                    # this, we only need to ensure periods NOT in any possible block on
                    # the chosen day/room cannot be assigned.
                    # We enforce: if no start_var at (d, *, r) covers p, this cell == 0.
                    can_be_covered = any(
                        (p_s <= p <= p_s + h - 1)
                        for p_s in range(periods - h + 1)
                    )
                    if not can_be_covered:
                        model.Add(assignments[(m["m_id"], d, p, r)] == 0)

        # Also enforce: for a lab, all hours must be on the SAME day.
        # (start_vars already belong to a specific day, and exactly-one-start
        #  ensures only one day is active — this is guaranteed automatically.)

        # Same-room enforcement: all periods link to the single active start_var's room.
        # Also guaranteed: start_var encodes (d, p_start, r) and forces each
        # assignments[..., r] = 1 — implicitly all in the same room.

    # 7. Max consecutive classes for a teacher (respect break/lunch slots)
    if max_consec > 0:
        for t_id, m_ids in teacher_mappings.items():
            for d in num_days:
                for start_p in range(periods - max_consec):
                    model.Add(
                        sum(assignments[(m_id, d, p, r)]
                            for m_id in m_ids
                            for p in range(start_p, start_p + max_consec + 1)
                            for r in num_rooms) <= max_consec
                    )

    # ── SOLVE ───────────────────────────────────────────────────────────────────
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 45.0
    status = solver.Solve(model)

    results = []
    if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
        for m in mappings:
            for d in num_days:
                for p in num_periods:
                    for r in num_rooms:
                        if solver.Value(assignments[(m["m_id"], d, p, r)]) == 1:
                            results.append({
                                "mapping_id": m["m_id"],
                                "section_id": m["section_id"],
                                "subject_id": m["subject_id"],
                                "teacher_ids": m["teacher_ids"],
                                "day": d,
                                "period": p,
                                "room_id": rooms[r]["id"],
                                "room_name": rooms[r].get("name", str(rooms[r]["id"])),
                                "subject_name": subjects_info[m["subject_id"]].get("name", str(m["subject_id"])),
                                "type": subjects_info[m["subject_id"]].get("type", "theory")
                            })

        return {"status": "success", "schedule": results}
    else:
        return {"status": "failed", "schedule": [], "solver_status": solver.StatusName(status)}
