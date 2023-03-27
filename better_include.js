
/* 

HOW TO INSTALL THE SCRIPT

1. Import better_include.js in Trilium with import function

2. In Menu < Configure Launchbar, right click on "Available Launcher" or "Visible launcher" tree and add a script launcher.

3. Set the "Script" relation to better_include.js and configure a keyboard shortcut. 

HOW TO USE THIS SCRIPT

1. Go into a text note

2. Select some text that starts with a title (h2,h3,h4, etc.)

- Be aware that each title is a delimiter for the script, it means that, if you have a structure like :
——————
## Title
Some text here

## Another title
Another text
——————
Then it will create 2 different subnotes.

Of course, it works even on a single "title — text" structure.

3. Use the script with the shortcut  : alt + w

Keep in mind that it's just a faster workaround to cutIntoNote + includeNote, because you can cut a lot of subnotes and include them immediately which was what I needed, so I made it.

BTW just ignore my french comments, I'm too lazy to remove them or to translate them…
*/

// Pour l'immédiativité

/*

Description des fonctionnalités :

La 1ère étape c'est que le script doit être executé dans la note en cours. En gros, je suis dans une note, je sélectionne du texte avec mon curseur, et j'active le script à l'aide d'un hotkey, et ça fait ce que je veux, c'est à dire une sorte de ALT X + ALT I pour inclure mais automatiquement mettre ce que j'ai coupé avant.

En fait, le cut & past selection to sub note prend le premier titre comme nom de fichier, donc je pense pouvoir dupliquer le fonctionnement de la fonction qui existe déjà, assez facilement.

Donc, il faut d'abord se focus sur la note où le curseur est actif. Une fois focus sur la note active, on se focus sur le texte qui est sélectionné, on va devoir couper ce texte, considérer que la première ligne est le titre et inclure automatiquement l'enfant qui vient d'être créé dans la note parent.

Quand on sait ce qu'on doit faire dans l'ordre exact, c'est beaucoup plus simple de s'y prendre sans se perdre. Décrire ce que l'on va faire avec exactitude avant de le faire, c'est ça le secret.

1. Créer nouvelle note à partir de sélection du curseur (fonction normale de création de sous-note)

2. Inclure automatiquement cette sous-note à l'emplacement du curseur où a été coupée le texte pour créer la sous-note

*/


function scrapeHtml(html) {
  const regex = /<(h[1-6])>(.+?)<\/\1>\s*([\s\S]+?)(?=<h[1-6]>|$)/g;
  const matches = {};
  let match;

  while ((match = regex.exec(html))) {
    const [, tag, title, content] = match;
    const formattedContent = content.trim().split('\n');
    matches[title.toLowerCase().replace(/\s/g, '_')] = [
      [`<${tag}>${title}</${tag}>`],
      formattedContent.map((paragraph) => paragraph.trim()),
    ];
  }

  return matches;
}
                        // La seule chose qui m'intéresse, c'est d'interagir avec le curseur, donc avec une instance de CKEDITOR ?
        // comment accéder au curseur de la note en cours ? Il faut que j'accède à l'instance de l'éditeur de la note de type text en cours, on est d'accord ? Comment faire ?
        const currentNote = await api.getActiveContextNote(); // Juste pour avoir la note en elle-même, sans l'instance CKEditor
              // A vrai dire, on devrait faire un test, pour être sûr que le type de la note n'est ni rien d'autre que "text", donc pas "code" ou pas "launcher", donc checker si type: "text" est bien respecté.
        if(currentNote.type != "text" ){
            api.showMessage("You can only include subnotes in text notes.")
            throw new Error('Try again in a text note');
        }
        const currentNoteEditor = await api.getActiveContextTextEditor(); // me permet d'avoir la note sur laquelle mon curseur est actif.
        // api.getActiveContextNote() pour avoir la note
       const  editor = currentNoteEditor
       const selected_text = editor.getSelectedHtml()
        if(selected_text != ''){
            // A partir d'ici, il faut créer une sous-note avec comme nom, le titre h1, h2, h3, etc. et stocker tous les paragraphes jusqu'au prochain titre comme faisant partie de cette sous-note. En pratique, il faut scraper le résultat stocké dans selected_text, et on pourrait faire en sorte que tout une note soit découpable en sous-note d'une seule traite. A chaque fois on a un titre et des paragraphes, et jusqu'au prochain titre B, tout paragraphe qui est en dessous d'un titre A appartiendra à une note A. A partir du titre B, on fait le même raisonnement.
            
            // Cela veut dire que cette condition doit tester plusieurs choses, à la fois que selected_text n'est pas vide, sinon ça signifie qu'on a rien sélectionné, et vérifier s'il y a plusieurs titres ou non, car le fonctionnement est évidemment différent en fonction de cette éventualité. Ça, ça reste une fonctionnalité avancé, il faut faire une version plus simple pour commencer.
            const obj = scrapeHtml(selected_text); // me permet d'obtenir l'objet que je vais scraper par la suite pour créer les notes
            const rootNote = currentNote.noteId // a priori on passera la variable currentNote
            for (const key in obj){
            const newNote = await api.runOnBackend((rootNote, obj, key) => {
                const removeTags = (str) => str.replace(/(<([^>]+)>)/ig,''); // Pour traiter les titres
                    const contenu = obj[key][1];
                    const titre = removeTags(obj[key][0][0]);
                    console.log(contenu)
                    console.log(titre)
                    const newNote = api.createTextNote(rootNote, titre, contenu)
                    return newNote.note;
                }, [rootNote, obj, key]);
                  await api.waitUntilSynced();
            const newNoteId = newNote.noteId;
            // On insère la note avec includeNote
            editor.model.change(writer => {
                const includedNote = writer.createElement('includeNote', {
                noteId: newNoteId,
                boxSize: "medium"
            })
            editor.model.insertContent(includedNote);
             const newParagraph = writer.createElement('paragraph');
              writer.insert(newParagraph, writer.model.document.selection.getLastPosition(), 'after');
          writer.setSelection(writer.createPositionAfter(newParagraph));
            })
            }
        api.showMessage("Created " + Object.keys(obj).length + " subnote" + (Object.keys(obj).length < 2 ? "" : "s"));
        }
;
