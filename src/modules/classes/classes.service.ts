import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassEntity } from './entities/class.entity';
import { ClassEnrollmentEntity } from './entities/class-enrollment.entity';

export interface ClassWithStudentCount {
  id: string;
  code: string;
  name: string;
  teacherId: string;
  academicYear: string;
  isActive: boolean;
  createdAt: Date;
  studentCount: number;
}

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(ClassEntity)
    private readonly classRepo: Repository<ClassEntity>,
    @InjectRepository(ClassEnrollmentEntity)
    private readonly enrollmentRepo: Repository<ClassEnrollmentEntity>,
  ) {}

  public async getClasses(
    userId: string,
    role: string,
  ): Promise<ClassWithStudentCount[]> {
    const qb = this.classRepo.createQueryBuilder('c');

    if (role === 'TEACHER') {
      qb.where('c.teacherId = :userId', { userId });
    }

    qb.andWhere('c.isActive = true');
    qb.orderBy('c.createdAt', 'DESC');

    const classes = await qb.getMany();

    const result: ClassWithStudentCount[] = [];
    for (const c of classes) {
      const studentCount = await this.enrollmentRepo.count({
        where: { classId: c.id },
      });
      result.push({
        id: c.id,
        code: c.code,
        name: c.name,
        teacherId: c.teacherId,
        academicYear: c.academicYear,
        isActive: c.isActive,
        createdAt: c.createdAt,
        studentCount,
      });
    }

    return result;
  }
}
