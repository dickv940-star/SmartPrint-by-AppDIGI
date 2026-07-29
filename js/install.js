let deferredPrompt;

const installBtn = document.getElementById("installBtn");


window.addEventListener(
"beforeinstallprompt",
(e)=>{

    e.preventDefault();

    deferredPrompt = e;

    installBtn.hidden = false;

});



installBtn.addEventListener(
"click",
async()=>{

    if(!deferredPrompt)
        return;


    deferredPrompt.prompt();


    const result =
    await deferredPrompt.userChoice;


    console.log(result);


    deferredPrompt=null;

});
