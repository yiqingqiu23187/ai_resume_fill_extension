/**
 * 简化的简历模板管理器
 * 配置化模板，简单的key-value字段管理
 */
class ResumeTemplateManager {
  constructor() {
    this.template = this.getDefaultTemplate();
    this.customFields = new Map();
  }

  // 默认模板配置 - 可以在这里方便地调整字段和placeholder
  getDefaultTemplate() {
    return {
      // 基本信息
      basic: {
        name: '基本信息',
        fields: {
          'name': '姓名',
          'phone': '手机号码',
          'email': '邮箱地址',
          'gender': '性别',
          'age': '年龄',
          'birthDate': '出生日期',
          'address': '现居地址',
          'idCard': '身份证号',
          'maritalStatus': '婚姻状况',
          'politicalStatus': '政治面貌',
          'ethnicity': '民族',
          'height': '身高',
          'weight': '体重'
        }
      },

      // 教育背景
      education: {
        name: '教育背景',
        fields: {
          'education': '最高学历',
          'school': '毕业院校',
          'major': '专业',
          'graduationDate': '毕业时间',
          'gpa': 'GPA/成绩',
          'englishLevel': '英语水平',
          'schoolType': '学校类型（985/211等）',
          'degree': '学位',
          'rank': '专业排名',
          'scholarships': '获得奖学金',
          'thesis': '毕业论文题目'
        }
      },

      // 工作经验
      work: {
        name: '工作经验',
        fields: {
          'workYears': '工作年限',
          'expectedSalary': '期望薪资',
          'currentCompany': '当前/最近公司',
          'currentPosition': '当前/最近职位',
          'workLocation': '工作地点',
          'jobType': '工作性质（全职/兼职）',
          'industry': '所在行业',
          'department': '所在部门',
          'reportTo': '汇报对象',
          'teamSize': '团队规模',
          'workDescription': '工作经历描述',
          'achievements': '主要成就',
          'reasonForLeaving': '离职原因'
        }
      },

      // 实习经验
      internship: {
        name: '实习经验',
        fields: {
          'internshipCompany': '实习公司',
          'internshipPosition': '实习职位',
          'internshipDuration': '实习时长',
          'internshipLocation': '实习地点',
          'internshipDescription': '实习经历描述',
          'internshipSupervisor': '实习导师',
          'internshipSalary': '实习薪资',
          'internshipAchievements': '实习成果'
        }
      },

      // 项目经历
      projects: {
        name: '项目经历',
        fields: {
          'projectName1': '项目名称1',
          'projectRole1': '项目角色1',
          'projectDescription1': '项目描述1',
          'projectTime1': '项目时间1',
          'projectTech1': '技术栈1',
          'projectName2': '项目名称2',
          'projectRole2': '项目角色2',
          'projectDescription2': '项目描述2',
          'projectTime2': '项目时间2',
          'projectTech2': '技术栈2'
        }
      },

      // 技能特长
      skills: {
        name: '技能特长',
        fields: {
          'skills': '专业技能',
          'programmingLanguages': '编程语言',
          'frameworks': '技术框架',
          'databases': '数据库',
          'tools': '开发工具',
          'certificates': '专业证书',
          'languages': '语言能力',
          'softSkills': '软技能',
          'hardSkills': '硬技能',
          'specialties': '专业特长'
        }
      },

      // 个人信息
      personal: {
        name: '个人信息',
        fields: {
          'selfIntroduction': '自我评价',
          'hobbies': '兴趣爱好',
          'awards': '获奖经历',
          'socialActivities': '社团活动',
          'volunteerWork': '志愿服务',
          'personalWebsite': '个人网站',
          'github': 'GitHub',
          'linkedin': 'LinkedIn',
          'blog': '个人博客',
          'portfolio': '作品集'
        }
      }
    };
  }

  // 获取所有字段的扁平化列表
  getAllFields() {
    const fields = [];
    Object.keys(this.template).forEach(categoryKey => {
      const category = this.template[categoryKey];
      Object.keys(category.fields).forEach(fieldKey => {
        fields.push({
          key: fieldKey,
          label: category.fields[fieldKey],
          category: categoryKey,
          categoryName: category.name,
          isCustom: false
        });
      });
    });

    // 添加自定义字段
    this.customFields.forEach((value, key) => {
      fields.push({
        key: key,
        label: value,
        category: 'custom',
        categoryName: '自定义字段',
        isCustom: true
      });
    });

    return fields;
  }

  // 添加自定义字段（简单的key-value形式）
  addCustomField(key, label) {
    if (!key || !label) {
      throw new Error('字段名称和标签都不能为空');
    }

    // 检查是否已存在
    if (this.isFieldExists(key)) {
      throw new Error('字段已存在');
    }

    this.customFields.set(key, label);
    return key;
  }

  // 删除自定义字段
  removeCustomField(key) {
    return this.customFields.delete(key);
  }

  // 检查字段是否存在
  isFieldExists(key) {
    // 检查默认字段
    for (const category of Object.values(this.template)) {
      if (category.fields[key]) {
        return true;
      }
    }
    // 检查自定义字段
    return this.customFields.has(key);
  }

  // 生成字段HTML
  generateFieldHTML(field) {
    const customClass = field.isCustom ? ' custom-field' : '';
    const deleteBtn = field.isCustom ?
      `<button type="button" class="field-delete-btn" title="删除字段" data-field-key="${field.key}">×</button>` : '';

    return `
      <div class="form-group field-item${customClass}" data-field-key="${field.key}">
        <label>${field.label}</label>
        <input type="text" name="${field.key}" placeholder="${field.label}">
        ${deleteBtn}
      </div>
    `;
  }

  // 按分类生成HTML
  generateCategoryHTML(categoryKey) {
    const category = this.template[categoryKey];
    if (!category) return '';

    const fields = Object.keys(category.fields).map(fieldKey => ({
      key: fieldKey,
      label: category.fields[fieldKey],
      category: categoryKey,
      categoryName: category.name,
      isCustom: false
    }));

    const fieldsHTML = this.generateFieldRows(fields);

    return `
      <div class="form-section" data-category="${categoryKey}">
        <div class="section-header-with-toggle">
          <h4>${category.name}</h4>
          <button type="button" class="section-toggle" data-target="${categoryKey}">收起</button>
        </div>
        <div class="section-content" id="section-${categoryKey}">
          ${fieldsHTML}
        </div>
      </div>
    `;
  }

  // 生成自定义字段HTML
  generateCustomFieldsHTML() {
    if (this.customFields.size === 0) return '';

    const fields = Array.from(this.customFields.entries()).map(([key, label]) => ({
      key: key,
      label: label,
      category: 'custom',
      categoryName: '自定义字段',
      isCustom: true
    }));

    const fieldsHTML = this.generateFieldRows(fields);

    return `
      <div class="form-section" data-category="custom">
        <div class="section-header-with-toggle">
          <h4>自定义字段</h4>
          <button type="button" class="section-toggle" data-target="custom">收起</button>
        </div>
        <div class="section-content" id="section-custom">
          ${fieldsHTML}
        </div>
      </div>
    `;
  }

  // 生成字段行（每行2个字段）
  generateFieldRows(fields) {
    let html = '';
    for (let i = 0; i < fields.length; i += 2) {
      html += '<div class="form-row">';
      html += this.generateFieldHTML(fields[i]);
      if (i + 1 < fields.length) {
        html += this.generateFieldHTML(fields[i + 1]);
      }
      html += '</div>';
    }
    return html;
  }

  // 获取统计信息
  getStats() {
    let totalFields = 0;
    Object.values(this.template).forEach(category => {
      totalFields += Object.keys(category.fields).length;
    });
    totalFields += this.customFields.size;

    return {
      total: totalFields,
      custom: this.customFields.size,
      categories: Object.keys(this.template).length + (this.customFields.size > 0 ? 1 : 0)
    };
  }
}

// 全局实例
window.resumeTemplateManager = new ResumeTemplateManager();
