import sys
import re

with open('Frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''          <div className="jd-main-content">
            <h2>{language === 'vi' ? 'Trách nhiệm chính' : 'Key Responsibilities'}</h2>
            <p>{
              (() => {
                const text = job.description || '';
                const m = text.match(/(?:M.? t.? C.?ng vi.?c|Trách nhiệm)(.*?)(?=Y.?u C.?u C.?ng Vi.?c|Yêu cầu công việc|Quy.?n l.?i|$)/i);
                return m ? m[1].trim() : text.substring(0, 300);
              })()
            }</p>
            <h2>{language === 'vi' ? 'Yêu cầu công việc' : 'Requirements'}</h2>
            <p>{
              (() => {
                const text = job.description || '';
                const m = text.match(/(?:Y.?u C.?u C.?ng Vi.?c|Yêu cầu công việc)(.*?)(?=Quy.?n l.?i|$)/i);
                return m ? m[1].trim() : '';
              })()
            }</p>
            <h2>{language === 'vi' ? 'Quyền lợi' : 'Benefits'}</h2>
            <p>{
              (() => {
                const text = job.description || '';
                const m = text.match(/(?:Quy.?n l.?i)(.*?)(?=$)/i);
                return m ? m[1].trim() : '';
              })()
            }</p>
          </div>'''

content = re.sub(r'<div className="jd-main-content">.*?</div>', replacement, content, flags=re.DOTALL)

with open('Frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
