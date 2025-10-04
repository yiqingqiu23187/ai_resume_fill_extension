/**
 * 结构化简历模板管理器
 * 支持复杂嵌套JSON结构，不再打平数据
 */
class ResumeTemplateManager {
  constructor() {
    this.template = this.getDefaultTemplate();
    this.customFields = new Map();
  }

  // 默认模板配置 - 最简化：字段名既是显示标签也是存储key
  getDefaultTemplate() {
    return {
      // 基本信息 - 简单对象
      "基本信息": {
        type: "object",
        fields: {
          "姓名": "如张三",
          "性别": "如：男/女",
          "手机号码": "请输入11位手机号码",
          "邮箱地址": "请输入常用邮箱地址",
          "年龄": "请输入年龄",
          "出生日期": "如：1995-06-15",
          "籍贯": "如 江苏省南通市如东县",
          "现居地址": "如 上海市浦东新区",
          "身份证号": "请输入18位身份证号码",
          "婚姻状况": "如：未婚/已婚/离异",
          "政治面貌": "如：共产党党员/共青团员/群众/其他党派",
          "民族": "如：汉族",
          "是否服从调剂": "如：是/否",
          "自我评价": "简单介绍个人特点和优势，50字以内##long##",
          "兴趣爱好": "如：阅读、运动、音乐",
          "期望薪资": "如：10000元/月",
          "工作地点偏好": "如：北京/上海/不限",
        }
      },

      // 教育经历 - 数组结构，支持多个教育经历
      "教育经历": {
        type: "array",
        itemName: "教育阶段",
        fields: {
          "学历阶段": "如：高中/本科/硕士/博士等",
          "学校": "请输入毕业院校",
          "专业": "请输入专业名称",
          "就读时间": "如：2022-09-01到2026-06-15",
          "学历类型": "如：全日制/在职/自考/网络教育",
          "学校等级": "如：985/211/普通本科/专科",
          "GPA成绩": "如：3.8/4.0",
          "专业排名": "如：5/120 前5%",
          "主修课程": "主要学习的课程，50字以内##long##",
          "是否挂科":  "如：是/否",
        }
      },


      "外语能力": {
        type: "array",
        itemName: "外语能力",
        fields: {
          "外语名称": "如：英语/日语/法语/德语",
          "外语水平": "如：CET-6 550分/托福90/雅思6.5",
          "证书编号": "如：TOEFL123/CEFR123"
        }
      },

      // 工作经历 - 数组结构
      "工作/实习经历": {
        type: "array",
        itemName: "工作/实习经历",
        fields: {
          "工作类型": "如：全职/实习/兼职",
          "公司名称": "请输入公司名称",
          "职位名称": "请输入职位名称",
          "在职时间": "如：2024-06-02到2024-11-11",
          "工作地点": "如：北京市海淀区",
          "所在部门": "如：产品设计部",
          "薪资": "如：3000元/月",
          "工作描述": "主要工作内容、职责和成果，300字以内##long##"
        }
      },

      // 项目经历 - 数组结构
      "科研/项目经历": {
        type: "array",
        itemName: "科研/项目经历",
        fields: {
          "项目名称": "请输入项目名称",
          "担任角色": "如：项目负责人",
          "项目时间": "如：2023-03-10到2023-09-12",
          "项目描述": "项目背景、方案和技术，100字以内##long##",
          "个人贡献": "在项目中的具体贡献，100字以内##long##",
          "项目成果": "项目最终成果和效果，100字以内##long##"
        }
      },

      "发表论文": {
        type: "array",
        itemName: "发表论文",
        fields: {
          "论文名称": "请输入论文名称",
          "发表时间": "如：2023-09-01",
          "发表刊物": "如：计算机学报"
        }
      },

      // 技能证书 - 对象结构
      "技能证书": {
        type: "array",
        itemName: "证书",
        fields: {
          "证书名称": "请输入证书名称",
          "证书获得时间": "如 2023-09-01",
          "证书编号": "请输入证书编号"
        }
      },

      // 获奖荣誉 - 数组结构
      "获奖荣誉": {
        type: "array",
        itemName: "获奖记录",
        fields: {
          "奖项名称": "请输入奖项名称",
          "获奖时间": "如：2023-05-29",
          "颁发机构": "如：江苏省共青团委",
          "奖项级别": "如：国家级/省级/市级/校级/院级",
          "获奖描述": "获奖原因和具体情况，100字以内##long##"
        }
      },

      "家庭成员": {
        type: "array",
        itemName: "家庭成员",
        fields: {
          "姓名": "如：张三",
          "关系": "如：父亲/母亲/配偶/兄弟/姐妹",
          "联系方式": "如：13800000000",
          "工作单位": "如：XX公司",
          "职务": "如：经理/主管/员工"
        }
      }
    };
  }

  // 生成字段HTML - 统一使用文本输入，限制300字符
  generateFieldHTML(fieldConfig, fieldName, sectionKey, itemIndex = null) {
    // fieldConfig 现在直接是 placeholder 字符串
    const placeholder = fieldConfig;
    const isLong = placeholder.includes('##long##');
    const cleanPlaceholder = placeholder.replace('##long##', '');

    const fieldId = itemIndex !== null ? `${sectionKey}_${itemIndex}_${fieldName}` : `${sectionKey}_${fieldName}`;
    const fieldPath = itemIndex !== null ? `${sectionKey}[${itemIndex}].${fieldName}` : `${sectionKey}.${fieldName}`;

    let html = `<div class="form-group field-item" data-field-path="${fieldPath}">`;
    html += `<label>${fieldName}</label>`;

    if (isLong) {
      // 长文本使用 textarea
      html += `<textarea
        name="${fieldId}"
        placeholder="${cleanPlaceholder}"
        rows="3"
        maxlength="300"
        class="long-text-field"
      ></textarea>`;
      html += `<div class="char-counter">
        <span class="current-count">0</span>/300字
      </div>`;
    } else {
      // 短文本使用 input
      html += `<input
        type="text"
        name="${fieldId}"
        placeholder="${cleanPlaceholder}"
        maxlength="300"
        class="short-text-field"
      >`;
    }

    html += `</div>`;
    return html;
  }

  // 生成分类HTML
  generateCategoryHTML(sectionKey) {
    const section = this.template[sectionKey];
    if (!section) return '';

    let html = `
      <div class="form-section" data-category="${sectionKey}">
        <div class="section-header-with-toggle">
          <h4>${sectionKey}</h4>
          <button type="button" class="section-toggle" data-target="${sectionKey}">收起</button>
        </div>
        <div class="section-content" id="section-${sectionKey}">
    `;

    if (section.type === 'array') {
      // 数组类型：可以添加多个条目
      html += `
        <div class="array-container" data-section="${sectionKey}">
          <div class="array-header">
            <button type="button" class="add-item-btn" data-section="${sectionKey}">
              + 添加${section.itemName}
            </button>
          </div>
          <div class="array-items" id="items-${sectionKey}">
            <!-- 动态生成的条目将插入这里 -->
          </div>
        </div>
      `;
    } else {
      // 对象类型：直接显示字段
      const fieldsHTML = this.generateFieldRows(section.fields, sectionKey);
      html += fieldsHTML;
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }

  // 生成数组项HTML
  generateArrayItemHTML(sectionKey, itemIndex) {
    const section = this.template[sectionKey];
    if (!section || section.type !== 'array') return '';

    const fieldsHTML = this.generateFieldRows(section.fields, sectionKey, itemIndex);

    return `
      <div class="array-item" data-section="${sectionKey}" data-index="${itemIndex}">
        <div class="array-item-header">
          <h5>${section.itemName} ${itemIndex + 1}</h5>
          <button type="button" class="remove-item-btn" data-section="${sectionKey}" data-index="${itemIndex}">
            删除
          </button>
        </div>
        <div class="array-item-content">
          ${fieldsHTML}
        </div>
      </div>
    `;
  }

  // 生成字段行（每行2个字段）
  generateFieldRows(fields, sectionKey, itemIndex = null) {
    const fieldEntries = Object.entries(fields);
    let html = '';

    for (let i = 0; i < fieldEntries.length; i += 2) {
      html += '<div class="form-row">';

      const [fieldName1, fieldConfig1] = fieldEntries[i];
      html += this.generateFieldHTML(fieldConfig1, fieldName1, sectionKey, itemIndex);

      if (i + 1 < fieldEntries.length) {
        const [fieldName2, fieldConfig2] = fieldEntries[i + 1];
        html += this.generateFieldHTML(fieldConfig2, fieldName2, sectionKey, itemIndex);
      }

      html += '</div>';
    }

    return html;
  }

  // 收集表单数据为结构化JSON
  collectFormData() {
    const resumeData = {};

    Object.keys(this.template).forEach(sectionKey => {
      const section = this.template[sectionKey];

      if (section.type === 'array') {
        // 数组类型数据收集
        resumeData[sectionKey] = [];
        const container = document.getElementById(`items-${sectionKey}`);
        if (container) {
          const items = container.querySelectorAll('.array-item');
          items.forEach((item, index) => {
            const itemData = {};
            Object.entries(section.fields).forEach(([fieldName, fieldConfig]) => {
              const fieldId = `${sectionKey}_${index}_${fieldName}`;
              const element = document.querySelector(`[name="${fieldId}"]`);
              if (element && element.value.trim()) {
                itemData[fieldName] = element.value.trim();
              }
            });
            if (Object.keys(itemData).length > 0) {
              resumeData[sectionKey].push(itemData);
            }
          });
        }
      } else {
        // 对象类型数据收集
        const sectionData = {};
        Object.entries(section.fields).forEach(([fieldName, fieldConfig]) => {
          const fieldId = `${sectionKey}_${fieldName}`;
          const element = document.querySelector(`[name="${fieldId}"]`);
          if (element && element.value.trim()) {
            sectionData[fieldName] = element.value.trim();
          }
        });
        if (Object.keys(sectionData).length > 0) {
          resumeData[sectionKey] = sectionData;
        }
      }
    });

    return resumeData;
  }

  // 填充表单数据
  populateFormData(resumeData) {
    // 1. 先处理模板中定义的字段
    Object.keys(resumeData).forEach(sectionKey => {
      const sectionData = resumeData[sectionKey];
      const section = this.template[sectionKey];

      if (!section) {
        // 如果模板中没有这个分类，说明是自定义字段，稍后处理
        return;
      }

      if (section.type === 'array' && Array.isArray(sectionData)) {
        // 数组数据填充
        sectionData.forEach((itemData, index) => {
          this.addArrayItem(sectionKey, itemData);
        });
      } else if (section.type === 'object' && typeof sectionData === 'object') {
        // 对象数据填充
        Object.entries(section.fields).forEach(([fieldName, fieldConfig]) => {
          const fieldId = `${sectionKey}_${fieldName}`;
          const element = document.querySelector(`[name="${fieldId}"]`);
          if (element && sectionData[fieldName]) {
            element.value = sectionData[fieldName];
          }
        });
      }
    });

    // 2. 处理自定义字段（不在模板中的字段）
    Object.keys(resumeData).forEach(sectionKey => {
      const sectionData = resumeData[sectionKey];
      const section = this.template[sectionKey];

      // 如果这个分类不在模板中，或者分类中有额外的字段
      if (!section && typeof sectionData === 'object' && !Array.isArray(sectionData)) {
        // 这是完全自定义的分类，把所有字段作为自定义字段添加
        Object.entries(sectionData).forEach(([fieldName, fieldValue]) => {
          const customFieldKey = `${sectionKey}.${fieldName}`;
          if (!this.customFields.has(customFieldKey)) {
            // 添加到自定义字段集合
            this.customFields.set(customFieldKey, {
              label: `${sectionKey} - ${fieldName}`,
              placeholder: `请输入${fieldName}`,
              category: sectionKey
            });
          }
        });
      } else if (section && section.type === 'object' && typeof sectionData === 'object') {
        // 检查是否有不在模板定义中的字段
        Object.keys(sectionData).forEach(fieldName => {
          if (!section.fields[fieldName]) {
            const customFieldKey = `${sectionKey}.${fieldName}`;
            if (!this.customFields.has(customFieldKey)) {
              this.customFields.set(customFieldKey, {
                label: `${sectionKey} - ${fieldName}`,
                placeholder: `请输入${fieldName}`,
                category: sectionKey
              });
            }
          }
        });
      }
    });

    // 3. 如果发现了自定义字段，重新渲染自定义字段区域
    if (this.customFields.size > 0) {
      // 触发重新渲染（需要在 popup.js 中调用模板初始化）
      console.log(`发现 ${this.customFields.size} 个自定义字段`);
    }
  }

  // 添加数组项
  addArrayItem(sectionKey, initialData = null) {
    const container = document.getElementById(`items-${sectionKey}`);
    if (!container) return;

    const items = container.querySelectorAll('.array-item');
    const itemIndex = items.length;

    const itemHTML = this.generateArrayItemHTML(sectionKey, itemIndex);
    container.insertAdjacentHTML('beforeend', itemHTML);

    // 如果有初始数据，填充到新添加的项中
    if (initialData) {
      const section = this.template[sectionKey];
      Object.entries(section.fields).forEach(([fieldName, fieldConfig]) => {
        const fieldId = `${sectionKey}_${itemIndex}_${fieldName}`;
        const element = document.querySelector(`[name="${fieldId}"]`);
        if (element && initialData[fieldName]) {
          element.value = initialData[fieldName];
        }
      });
    }

    // 绑定删除事件
    const removeBtn = container.querySelector(`.remove-item-btn[data-section="${sectionKey}"][data-index="${itemIndex}"]`);
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        this.removeArrayItem(sectionKey, itemIndex);
      });
    }
  }

  // 删除数组项
  removeArrayItem(sectionKey, itemIndex) {
    const item = document.querySelector(`[data-section="${sectionKey}"][data-index="${itemIndex}"]`);
    if (item && confirm('确定要删除这条记录吗？')) {
      item.remove();
      // 重新编号
      this.reindexArrayItems(sectionKey);
    }
  }

  // 重新编号数组项
  reindexArrayItems(sectionKey) {
    const container = document.getElementById(`items-${sectionKey}`);
    if (!container) return;

    const items = container.querySelectorAll('.array-item');
    items.forEach((item, newIndex) => {
      item.setAttribute('data-index', newIndex);

      // 更新标题
      const title = item.querySelector('h5');
      if (title) {
        const section = this.template[sectionKey];
        title.textContent = `${section.itemName} ${newIndex + 1}`;
      }

      // 更新表单字段name和id
      const fields = item.querySelectorAll('input, select, textarea');
      fields.forEach(field => {
        const oldName = field.name;
        const newName = oldName.replace(/(_\d+_)/, `_${newIndex}_`);
        field.name = newName;
      });

      // 更新删除按钮
      const removeBtn = item.querySelector('.remove-item-btn');
      if (removeBtn) {
        removeBtn.setAttribute('data-index', newIndex);
      }
    });
  }

  // 生成自定义字段HTML（如果有自定义字段）
  generateCustomFieldsHTML() {
    if (this.customFields.size === 0) {
      return '';
    }

    let html = `
      <div class="form-section" data-category="自定义字段">
        <div class="section-header-with-toggle">
          <h4>自定义字段</h4>
          <button type="button" class="section-toggle" data-target="自定义字段">收起</button>
        </div>
        <div class="section-content" id="section-自定义字段">
    `;

    // 生成自定义字段的HTML
    const customFieldsArray = Array.from(this.customFields.entries());
    for (let i = 0; i < customFieldsArray.length; i += 2) {
      html += '<div class="form-row">';

      const [fieldName1, fieldConfig1] = customFieldsArray[i];
      html += this.generateFieldHTML(fieldConfig1, fieldName1, '自定义字段', null);

      if (i + 1 < customFieldsArray.length) {
        const [fieldName2, fieldConfig2] = customFieldsArray[i + 1];
        html += this.generateFieldHTML(fieldConfig2, fieldName2, '自定义字段', null);
      }

      html += '</div>';
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }

  // 获取统计信息
  getStats() {
    let totalSections = Object.keys(this.template).length;
    let totalFields = 0;

    Object.values(this.template).forEach(section => {
      totalFields += Object.keys(section.fields).length;
    });

    return {
      total: totalFields,
      sections: totalSections,
      custom: this.customFields.size
    };
  }
}

// 全局实例
window.resumeTemplateManager = new ResumeTemplateManager();
