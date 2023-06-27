import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';

import { AuthPageComponent } from '../auth-page/auth-page.component';
import * as firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/storage';
import 'firebase/auth';

@Component({
  selector: 'page-ImagesUpload',
  templateUrl: 'ImagesUpload.html',
})
export class ImagesUpload {
  rootPage: any;
  processing: boolean;
  saving: boolean;
  user: {};
  eventname: string = 'Tennis';
  pageOne: boolean = true;
  pageTwo: boolean = false;
  pageConfirm: boolean = false;
  uploadImage: string[] = [];
  uploadImage_orig: string[] = [];
  hashtaglist: string[] = ['individual', 'group', 'mvp', 'goal'];
  chosen_hashes: string[] = [];
  chosen_files: File[] = [];
  watermark_files: File[] = [];
  uploadVideo: string = '';
  uploadVideoType: string = '';
  post_id: string = '';
  this_post: Object = {
    description: '',
    files: [],
    hashtags: [],
    likes: 0,
    author: {},
    price: 0,
  };
  orig_file: Object = {
    files: [],
  };

  constructor(public navCtrl: NavController) {
    const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
      console.log('hh');
      console.log(user);
      if (user === null || user.isAnonymous) {
        this.navCtrl.setRoot(AuthPageComponent);
      } else {
        this.this_post['author']['name'] = user.displayName.split(' ')[0];
        this.this_post['author']['pic'] = user.photoURL;
        this.this_post['author']['uid'] = user.uid;
      }
    });
  }

  toggle_hash(hashtag) {
    var that = this;
    var _hashtags = this.this_post['hashtags'];
    var index = 0;

    if (_hashtags.indexOf(hashtag) > -1) {
      index = _hashtags.indexOf(hashtag);
      _hashtags.splice(index, 1);
    } else {
      _hashtags.push(hashtag);
    }
  }

  presentActionSheet(fileLoader) {
    fileLoader.click();
    var that = this;
    fileLoader.onchange = function () {
      var file = fileLoader.files[0];
      var reader = new FileReader();

      reader.addEventListener(
        'load',
        function () {
          var i = 0;
          that.processing = true;
          console.log(file.type);
          if (file.type.includes('video')) {
            that.uploadVideo = reader.result;
            that.uploadVideoType = file.type;
          } else if (file.type.includes('image')) {
            that.uploadImage.push(reader.result);
            that.uploadImage_orig.push(reader.result);
          }
          that.processing = false;
        },
        false
      );

      if (file) {
        reader.readAsDataURL(file);
        that.chosen_files.push(file);
      }
    };
  }

  process_watermark() {
    this.processing = true;

    var i = 0;
    //make the watermark for all image files if price > 0
    if (this.this_post['price'] > 0) {
      while (this.chosen_files.length > i) {
        if (!this.chosen_files[i]['watermark']) {
          this.make_watermark(i);
        }
        i++;
      }
    } else {
      //reset if watermark has been previously set

      while (this.chosen_files.length > i) {
        if (this.chosen_files[i]['watermark']) {
          this.reset_watermark(i);
        }
        i++;
      }
    }

    this.processing = false;
  }

  reset_watermark(l) {
    this.uploadImage[l] = this.uploadImage_orig[l];
    this.chosen_files[l]['watermark'] = false;
    this.watermark_files.splice(l, 1);
  }

  makeid(length) {
    let result = '';
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }

  make_watermark(l) {
    var _name = 'checkinImage_' + l;

    var _image = document.getElementById(_name);
    var watermark_object = this.watermarkImageWithText(_image, 'Watermark');
    watermark_object.toBlob((blob) => {
      let file = new File([blob], this.makeid(9) + 'jpg', {
        type: 'image/jpeg',
      });
      this.watermark_files.push(file);
    }, 'image/jpeg');

    this.uploadImage[l] = watermark_object.toDataURL();

    this.chosen_files[l]['watermark'] = true;
  }

  deleteImage(index) {
    var folder = '';
    var that = this;
    that.processing = true; //standard processing
    var file = that.chosen_files[index];
    var type = that.chosen_files[index]['type'];

    that.processing = false;
    that.chosen_files.splice(index, 1);
    that.watermark_files.splice(index, 1);
    that.uploadImage.splice(index, 1);
    that.uploadImage_orig.splice(index, 1);
  }

  watermarkImageWithText(originalImage, watermarkText) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    const canvasWidth = originalImage.width;
    const canvasHeight = originalImage.height;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // initializing the canvas with the original image
    context.drawImage(originalImage, 0, 0, canvasWidth, canvasHeight);

    // adding a blue watermark text in the bottom right corner
    context.fillStyle = 'grey';
    context.textBaseline = 'middle';
    context.font = 'bold 45px serif';
    context.fillText(watermarkText, 150, 150);
    return canvas;
  }

  deleteVideo() {
    var folder = '';
    var that = this;
    that.processing = true; //standard processing

    that.processing = false;
    that.chosen_files.splice(0, 1);
    that.uploadVideo = '';
    that.uploadVideoType = '';
  }

  saveFile(file: File, type: string, folder: string) {
    var that = this;
    var location = folder + file.name;
    const db = firebase.firestore();
    var _f = { type: file.type, location: location, downloadURL: '' };
    //save to firebase
    // Create a root reference
    var storageRef = firebase.storage().ref();
    console.log(_f);
    return storageRef
      .child(location)
      .put(file)
      .then(function (snapshot) {
        console.log('Uploaded', snapshot.totalBytes, 'bytes.');
        //not sure why this isn't working.
        return snapshot.ref
          .getDownloadURL()
          .then((url) => {
            that.saving = false;
            _f.downloadURL = url;
            that.this_post['files'].push(_f);
            console.log(that.this_post);
            return true;
          })
          .catch((error) => {
            that.saving = false;
            return true;
          });
      })
      .catch((error) => {
        console.log(error);
      });
  }

  save_orig(file: File, type: string, folder: string) {
    var that = this;
    that.saving = true;
    var location = folder + '/' + file.name;
    const db = firebase.firestore();
    var _f = { type: file.type, location: location, downloadURL: '' };
    //save to firebase
    // Create a root reference
    var storageRef = firebase.storage().ref();
    console.log(_f);
    return storageRef
      .child(location)
      .put(file)
      .then(function (snapshot) {
        console.log('Uploaded orig', snapshot.totalBytes, 'bytes.');
        //not sure why this isn't working.
        return snapshot.ref
          .getDownloadURL()
          .then((url) => {
            that.saving = false;
            _f.downloadURL = url;
            that.orig_file['files'].push(_f);
            //  console.log(that.orig_file);
            return true;
          })
          .catch((error) => {
            that.saving = false;
            return true;
          });
      })
      .catch((error) => {
        console.log(error);
      });
  }

  async prepost_process() {
    var i = 0;
    var process_array = [];
    var _p;
    var _p_orig;

    if (this.this_post['price'] > 0) {
      while (this.watermark_files.length > i) {
        var file = this.watermark_files[i];
        await this.saveFile(file, file.type, 'content');
        await this.save_orig(
          this.chosen_files[i],
          this.chosen_files[i].type,
          'paid'
        );

        i++;
      }
    } else {
      while (this.chosen_files.length > i) {
        var file = this.chosen_files[i];
        await this.saveFile(file, file.type, 'content');
        i++;
      }
    }
    await this.sendpost(); //required to update the post_id value

    if (this.this_post['price'] > 0) {
      await this.add_paid_info();
    }

    console.log('post finished');
    console.log(this.post_id);
    this.pageConfirm = true;
    this.pageOne = false;
  }

  sendpost() {
    this.saving = true;
    var that = this;
    var _post = that.this_post;
    console.log('sendpost');
    console.log(_post);
    var _event = that.eventname;

    let db = firebase.firestore();
    let dbRef = db.collection(_event);
    return dbRef
      .add(_post)
      .then((result) => {
        that.saving = false;
        console.log('Data updated in Firestore!');
        that.post_id = result.id;
      })
      .catch(() => {
        console.log('Error');
      });
  }

  add_paid_info() {
    this.saving = true;
    var that = this;
    var _post = that.orig_file;
    var post_id = this.post_id;
    var _event = that.eventname;

    _post['event_name'] = _event;
    _post['post_id'] = post_id;

    let db = firebase.firestore();
    let dbRef = db.collection('paid');
    return dbRef
      .add(_post)
      .then((result) => {
        that.saving = false;
        console.log('OrigData updated in Firestore!');
      })
      .catch(() => {
        console.log('Error');
      });
  }
}
