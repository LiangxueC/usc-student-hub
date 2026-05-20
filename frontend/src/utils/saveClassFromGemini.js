// Saves a class and all its associated data from a Gemini JSON response.
// Mirrors the save flow in SyllabusUpload.jsx.
// Returns the created class object.
export async function saveClassFromGemini(data, apiFetch) {
  if (!data.class_name) throw new Error("No class name found in syllabus data.");

  // 1. Create class
  const cls = await apiFetch("/classes/", {
    method: "POST",
    body: JSON.stringify({
      name: data.class_name,
      location: data.location ?? null,
      meeting_times: data.meeting_times ?? null,
      semester: data.semester ?? null,
    }),
  });

  // 2. Grade categories
  const categoryMap = {};
  for (const gw of data.grade_weights ?? []) {
    if (!gw.category?.trim() || gw.weight == null) continue;
    const created = await apiFetch("/grade-categories/", {
      method: "POST",
      body: JSON.stringify({
        class_id: cls.id,
        name: gw.category.trim(),
        weight: parseFloat(gw.weight),
      }),
    });
    categoryMap[gw.category.trim().toLowerCase()] = created.id;
  }

  // 3. Assignments
  for (const a of data.assignments ?? []) {
    const key = a.category?.trim().toLowerCase();
    await apiFetch("/assignments/", {
      method: "POST",
      body: JSON.stringify({
        title: a.title,
        class_id: cls.id,
        category_id: key ? (categoryMap[key] ?? null) : null,
        due_date: a.due_date ?? null,
      }),
    });
  }

  // 4. Office hours
  for (const oh of data.office_hours ?? []) {
    if (!oh.day?.trim() || !oh.start_time?.trim() || !oh.end_time?.trim()) continue;
    await apiFetch("/office-hours/", {
      method: "POST",
      body: JSON.stringify({
        class_id: cls.id,
        day: oh.day.trim(),
        start_time: oh.start_time.trim(),
        end_time: oh.end_time.trim(),
        location: oh.location?.trim() ?? "",
      }),
    });
  }

  return cls;
}
