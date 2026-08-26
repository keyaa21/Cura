package com.cura.cura.model;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
@Data

public class DoctorSchedule
{
@Id
private String Id;

private String doctorId;

private LocalDate date;

private List <String> AvailableSlots;
}

