(()=>{
'use strict';
const $=id=>document.getElementById(id);
const ROOT='https://wvixivswjqxyunpoiqrl.supabase.co';
const KEY='sb_publishable_5rU0FOrKI2HO_kYI-FGYmQ_9Gxq3SwP';
async function call(path,body,token){
 const r=await fetch(ROOT+path,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.msg||j.message||j.error_description||j.error||'Ошибка сервера');return j;
}
function init(){
 const login=$('ml-submit');if(!login||$('navo-forgot-password'))return;
 const forgot=document.createElement('button');forgot.id='navo-forgot-password';forgot.type='button';forgot.className='secondary';forgot.style.cssText='margin-top:12px;width:100%';forgot.textContent='Забыли пароль?';login.insertAdjacentElement('afterend',forgot);
 const panel=document.createElement('div');panel.id='navo-recovery-panel';panel.hidden=true;panel.className='item';
 const title=document.createElement('h3');title.textContent='Восстановление пароля';
 const info=document.createElement('p');info.textContent='Укажите почту мастера. Мы отправим письмо со ссылкой для установки нового пароля.';
 const email=document.createElement('input');email.type='email';email.placeholder='Электронная почта';email.autocomplete='email';
 const send=document.createElement('button');send.type='button';send.className='primary full';send.textContent='Отправить письмо для восстановления';
 const status=document.createElement('p');status.setAttribute('role','status');
 const back=document.createElement('button');back.type='button';back.className='secondary full';back.textContent='← Назад ко входу';back.onclick=()=>panel.hidden=true;
 send.onclick=async()=>{const address=email.value.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)){status.textContent='Введите корректный адрес почты';return}
 send.disabled=true;status.textContent='Отправляем письмо…';try{
 await call('/auth/v1/recover',{email:address,gotrue_meta_security:{}});
 status.textContent='Если почта зарегистрирована, письмо со ссылкой для восстановления будет отправлено. Проверьте также папку «Спам».';
 }catch(e){status.textContent='Ошибка отправки: '+e.message}finally{send.disabled=false}};
 panel.append(title,info,email,send,status,back);forgot.insertAdjacentElement('afterend',panel);
 forgot.onclick=()=>{panel.hidden=!panel.hidden;email.value=$('ml-email')?.value||'';if(!panel.hidden)email.focus()};
 const params=new URLSearchParams(location.hash.replace(/^#/,''));const query=new URLSearchParams(location.search);
 const recovery=params.get('type')==='recovery'&&params.get('access_token');
 if(recovery){
 const section=$('master-login');if(section){section.classList.remove('hide');$('inside')?.classList.remove('hide');}
 const reset=document.createElement('div');reset.className='item';
 const h=document.createElement('h3');h.textContent='Установить новый пароль';
 const pwd=document.createElement('input');pwd.type='password';pwd.placeholder='Новый пароль (не менее 8 символов)';pwd.autocomplete='new-password';
 const confirm=document.createElement('input');confirm.type='password';confirm.placeholder='Повторите новый пароль';confirm.autocomplete='new-password';
 const button=document.createElement('button');button.className='primary full';button.type='button';button.textContent='Сохранить новый пароль';
 const result=document.createElement('p');result.setAttribute('role','status');
 button.onclick=async()=>{if(pwd.value.length<8){result.textContent='Пароль должен содержать не менее 8 символов';return}if(pwd.value!==confirm.value){result.textContent='Пароли не совпадают';return}
 button.disabled=true;try{const r=await fetch(ROOT+'/auth/v1/user',{method:'PUT',headers:{apikey:KEY,Authorization:'Bearer '+recovery,'Content-Type':'application/json'},body:JSON.stringify({password:pwd.value})});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.msg||j.message||'Ошибка изменения пароля');result.textContent='✓ Пароль изменён. Теперь войдите в кабинет мастера с новым паролем.';history.replaceState(null,'',location.pathname+'?v=81');pwd.value='';confirm.value='';reset.remove()}catch(e){result.textContent='Ошибка: '+e.message}finally{button.disabled=false}};
 reset.append(h,pwd,confirm,button,result);section?.insertBefore(reset,section.firstChild);reset.scrollIntoView({block:'start'});
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();