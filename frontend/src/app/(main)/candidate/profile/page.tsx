"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { getApiError } from "@/lib/api";
import { toCloudinaryDownloadUrl } from "@/lib/utils";
import {
  useCandidateProfile,
  useSaveCandidateProfile,
  useUploadCandidateAvatar,
  useUploadCandidateResume,
} from "@/hooks/use-candidate-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

const schema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100),
  bio: z.string().max(1000, "Bio must be 1000 characters or fewer").optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CandidateProfilePage(): JSX.Element {
  const {
    data: profile,
    isLoading,
    profileMissing,
    error,
  } = useCandidateProfile();
  const mode = profileMissing ? "create" : "update";
  const save = useSaveCandidateProfile(mode);
  const uploadAvatar = useUploadCandidateAvatar();
  const uploadResume = useUploadCandidateResume();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (profile) {
      reset({ fullName: profile.fullName, bio: profile.bio ?? "" });
    }
  }, [profile, reset]);

  const onSubmit = handleSubmit((values) => {
    save.mutate(
      { fullName: values.fullName, bio: values.bio || undefined },
      {
        onSuccess: () => {
          toast.success(
            mode === "create" ? "Profile created" : "Profile updated",
          );
        },
        onError: (err) => {
          toast.error(getApiError(err)?.message ?? "Failed to save profile");
        },
      },
    );
  });

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadAvatar.mutate(file, {
      onSuccess: () => toast.success("Avatar updated"),
      onError: (err) =>
        toast.error(getApiError(err)?.message ?? "Failed to upload avatar"),
    });
    e.target.value = "";
  }

  function onResumeChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadResume.mutate(file, {
      onSuccess: () => toast.success("Resume updated"),
      onError: (err) =>
        toast.error(getApiError(err)?.message ?? "Failed to upload resume"),
    });
    e.target.value = "";
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error && !profileMissing) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-destructive">
          {getApiError(error)?.message ?? "Failed to load profile"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,var(--accent),transparent)]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-2xl px-4 pt-10 pb-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {mode === "create" ? "Create your profile" : "Your profile"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "create"
              ? "Companies see this when you apply to a job."
              : "Keep your details up to date so companies can find you."}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4 pb-8">
        <Card>
          <CardContent className="flex flex-col gap-6">
            {mode === "update" && (
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-accent">
                  <AvatarImage src={profile?.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-accent text-accent-foreground">
                    {profile?.fullName?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-2">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={onAvatarChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadAvatar.isPending}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {uploadAvatar.isPending ? "Uploading…" : "Change avatar"}
                  </Button>
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={onResumeChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadResume.isPending}
                    onClick={() => resumeInputRef.current?.click()}
                  >
                    {uploadResume.isPending
                      ? "Uploading…"
                      : profile?.resumeUrl
                        ? "Replace resume"
                        : "Upload resume"}
                  </Button>
                  {profile?.resumeUrl && (
                    <div className="flex gap-3">
                      <a
                        href={profile.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        View resume
                      </a>
                      <a
                        href={toCloudinaryDownloadUrl(profile.resumeUrl)}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        Download
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            <form
              id="candidate-profile-form"
              onSubmit={onSubmit}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  aria-invalid={!!errors.fullName}
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <p className="text-xs text-destructive">
                    {errors.fullName.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  rows={5}
                  aria-invalid={!!errors.bio}
                  className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30"
                  placeholder="Tell companies a bit about yourself…"
                  {...register("bio")}
                />
                {errors.bio && (
                  <p className="text-xs text-destructive">
                    {errors.bio.message}
                  </p>
                )}
              </div>
            </form>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              form="candidate-profile-form"
              disabled={save.isPending}
            >
              {save.isPending
                ? "Saving…"
                : mode === "create"
                  ? "Create profile"
                  : "Save changes"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
