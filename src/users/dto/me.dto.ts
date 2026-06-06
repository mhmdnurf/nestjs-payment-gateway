export class MeResponseDto {
  id!: string;
  email!: string;
  username!: string;
  name!: string | null;
  role!: string;
  isActive!: boolean;
  emailVerifiedAt!: Date | null;
  createdAt!: Date;
}
