import Link from "next/link";
import { Pencil } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";
import type { PatientStatus } from "@/types/database.types";

const STATUS_VARIANT: Record<PatientStatus, "success" | "secondary" | "destructive"> = {
  active: "success",
  inactive: "secondary",
  deceased: "destructive",
};

interface PatientHeaderProps {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: string;
  status: PatientStatus;
}

export function PatientHeader(props: PatientHeaderProps) {
  const age = Math.floor(
    (Date.now() - new Date(props.dateOfBirth + "T00:00:00").getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="text-lg">{getInitials(props.firstName, props.lastName)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">
              {props.firstName} {props.lastName}
            </h2>
            <Badge variant={STATUS_VARIANT[props.status]} className="capitalize">
              {props.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {props.mrn} · {age} yrs · {new Date(props.dateOfBirth + "T00:00:00").toLocaleDateString()} ·{" "}
            <span className="capitalize">{props.sex}</span>
          </p>
        </div>
      </div>
      <Button variant="outline" asChild>
        <Link href={`/patients/${props.id}/edit`}>
          <Pencil className="h-4 w-4" />
          Edit patient
        </Link>
      </Button>
    </div>
  );
}
